/**
 * @fileoverview HTML content scraping service
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { chromium } from 'playwright';
import fs from 'fs-extra';
import config from '../config/index.js';
import { ScraperError, handleError, retry, ProgressTracker } from '../utils/errors.js';
import { writeJSON, getFiles } from '../utils/filesystem.js';

/**
 * HTML Scraper Service
 * Handles web scraping operations with robust error handling and retry logic
 */
export class HTMLScraperService {
  constructor(options = {}) {
    this.config = { ...config.get('scraper'), ...options };
    this.browser = null;
    // Store content type and specific selector for prioritized extraction
    this.contentType = options.contentType || null;
    this.contentSelector = options.contentSelector || null;
  }

  /**
   * Initialize the browser instance
   * @private
   * @returns {Promise<void>}
   */
  async _initBrowser() {
    if (this.browser) return;

    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    } catch (error) {
      throw new ScraperError('Failed to initialize browser', error);
    }
  }

  /**
   * Clean up browser resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Extract URLs and content types from text format
   * @param {string} text - Text containing URLs
   * @returns {Array<Object>} Array of URL objects with metadata
   */
  extractUrlsFromText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const urlData = [];
    
    for (const line of lines) {
      // Skip comments
      if (line.startsWith('#') || line.startsWith('//')) {
        continue;
      }
      
      // Parse line for URL and optional type
      const parts = line.split(/\s+/);
      const url = parts[0];
      const type = parts[1] && ['page', 'post'].includes(parts[1].toLowerCase()) ? parts[1].toLowerCase() : null;
      
      // Validate URL format
      if (/^https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(url)) {
        // Clean URL of trailing punctuation
        const cleanUrl = url.replace(/[.,;:!?)]+$/, '');
        
        // Check for duplicates
        if (!urlData.find(item => item.url === cleanUrl)) {
          urlData.push({ 
            url: cleanUrl, 
            type: type,
            source: 'manual'
          });
        }
      }
    }
    
    return urlData;
  }

  /**
   * Load URLs from various sources
   * @returns {Promise<Array<string>>} Array of URLs to scrape
   */
  async loadUrls() {
    const dataConfig = config.get('data');
    let urlData = [];
    
    // Method 1: Try loading from urls.txt file
    try {
      const urlsFile = config.resolvePath(dataConfig.urlsFile);
      const fileExists = await fs.pathExists(urlsFile);
      
      if (fileExists) {
        const fileContent = await fs.readFile(urlsFile, 'utf-8');
        
        if (fileContent.trim()) {
          urlData = this.extractUrlsFromText(fileContent);
          
          if (urlData.length > 0) {
            const manualTypes = urlData.filter(item => item.type).length;
            const autoTypes = urlData.length - manualTypes;
            
            console.log(`✅ Found ${urlData.length} URLs in ${dataConfig.urlsFile}`);
            if (manualTypes > 0) {
              console.log(`   📋 ${manualTypes} with manual type designation (page/post)`);
            }
            if (autoTypes > 0) {
              console.log(`   🔍 ${autoTypes} will use automatic detection`);
            }
            
            // Save content type mappings for XML generator
            await this._saveContentTypeMappings(urlData);
            
            return urlData.map(item => item.url);
          }
        }
      }
    } catch (error) {
      console.warn('Could not load URLs from file:', error.message);
    }
    
    // Method 2: Try environment variables  
    const envText = process.env.SCRAPE_URLS || 
                    process.env.URLS_TO_SCRAPE || 
                    process.env.URLS || '';
    
    if (envText.trim()) {
      console.log('📄 Loading URLs from environment variables...');
      urlData = this.extractUrlsFromText(envText);
      
      if (urlData.length > 0) {
        console.log(`✅ Found ${urlData.length} URLs in environment`);
        
        // Save content type mappings for XML generator
        await this._saveContentTypeMappings(urlData);
        
        return urlData.map(item => item.url);
      }
    }
    
    throw new ScraperError('No URLs found. Please provide URLs in data/urls.txt or environment variables.');
  }

  /**
   * Save content type mappings for XML generator
   * @private
   * @param {Array<Object>} urlData - URL data with types
   * @returns {Promise<void>}
   */
  async _saveContentTypeMappings(urlData) {
    try {
      const mappings = {};
      urlData.forEach(item => {
        if (item.type) {
          // Convert URL to filename-like format for mapping
          const cleanUrl = item.url.replace(/https?:\/\//, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
          mappings[cleanUrl] = item.type;
        }
      });
      
      if (Object.keys(mappings).length > 0) {
        const dataConfig = config.get('data');
        await writeJSON(config.resolvePath(dataConfig.contentTypeMappings), mappings);
        console.log(`📋 Saved ${Object.keys(mappings).length} content type mappings`);
      }
    } catch (error) {
      console.warn('Could not save content type mappings:', error.message);
    }
  }

  /**
   * Clean HTML content minimally (remove scripts, styles, event handlers)
   * @private
   * @param {string} html - Raw HTML content
   * @returns {string} Cleaned HTML content
   */
  _cleanHTML(html) {
    let cleaned = html
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove style tags and their content
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove event handlers (onclick, onload, etc.)
      .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove noscript tags but keep content
      .replace(/<\/?noscript[^>]*>/gi, '')
      // Clean up excessive whitespace but preserve structure
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  /**
   * Generate safe filename from URL
   * @private
   * @param {string} url - The URL to convert
   * @returns {string} Safe filename
   */
  _generateFilename(url) {
    return url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 255); // Increased limit - most filesystems support 255 chars
  }

  /**
   * Scrape a single URL
   * @private
   * @param {string} url - URL to scrape
   * @returns {Promise<Object>} Scraping result
   */
  async _scrapeSingleUrl(url) {
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: this.config.userAgent,
      ignoreHTTPSErrors: true,
      bypassCSP: true
    });

    const page = await context.newPage();
    
    try {
      // Block resource-heavy requests for faster scraping
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'font', 'media', 'manifest', 'other'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      if (!response) {
        throw new ScraperError(`Failed to load page: ${url}`);
      }

      const status = response.status();
      if (status >= 400) {
        throw new ScraperError(`HTTP ${status}: ${response.statusText()} for ${url}`);
      }

      // Wait for page to load
      await page.waitForTimeout(this.config.waitTime);

      // Try to find and extract content
      let rawContent = null;
      let contentFound = false;

      // Build content selector list with priority:
      // 1. Type-specific selector (from blogPost.contentSelector or page.contentSelector) if provided
      // 2. Custom selectors from site profile config (this.config.contentSelectors)
      // 3. Default fallback selectors
      const contentSelectors = [];
      
      // Priority 1: Use type-specific selector if provided
      if (this.contentSelector) {
        contentSelectors.push(this.contentSelector);
        console.log(`   🎯 Using type-specific content selector: ${this.contentSelector}`);
      }
      
      // Priority 2: Use custom selectors from config (site profile)
      if (this.config.contentSelectors && Array.isArray(this.config.contentSelectors) && this.config.contentSelectors.length > 0) {
        contentSelectors.push(...this.config.contentSelectors);
        console.log(`   📋 Using ${this.config.contentSelectors.length} custom selector(s) from profile`);
      }
      
      // Priority 3: Default fallback selectors
      // SEPARATE LOGIC: Posts and Pages need different selector priorities
      let defaultSelectors = [];
      
      // If we know the content type, prioritize accordingly
      if (this.contentType === 'post') {
        // POST SELECTORS: Prioritize blog post specific containers
        defaultSelectors = [
          '.blog-post-detail',    // HIGHEST PRIORITY: Dealer.com blog post container
          '.entry-content',       // WordPress/blog entry content
          'article',              // Semantic HTML5 article element
          '.post-content',        // Blog post specific
          '.ddc-span8',          // DDC layout - main content area (for posts)
          '.ddc-content',        // DDC container
          '.main-content',        // Common main content class
          '#content',             // Generic content ID
          '.content',             // Generic content class
          'body'                  // Last resort fallback
        ];
      } else if (this.contentType === 'page') {
        // PAGE SELECTORS: Prioritize page-specific containers
        defaultSelectors = [
          '.main',                // HIGHEST PRIORITY: Dealer.com main content class - contains ALL page content
          'main',                 // Semantic HTML5 main element - captures everything
          '#page-body',           // Dealer.com page body container (has all page content)
          '.ddc-wrapper',         // Dealer.com wrapper that contains full page content
          '.ddc-span8',          // DDC layout specific - main content area
          '.ddc-content',        // DDC container
          '.main-content',        // Common main content class
          '#content',             // Generic content ID
          // Dealer.com specific page selectors (before generic .content)
          '.ddc-span8 .ddc-content',  // DDC nested content
          '.ddc-row .ddc-span8',       // DDC row with span8
          'main .ddc-content',         // Main with DDC content
          '.content:not(.nav-fragment):not(.ajax-navigation-element)',  // Content excluding navigation
          '.content',             // Generic content class (may match footer on some sites)
          'body'                  // Last resort fallback
        ];
      } else {
        // UNKNOWN TYPE: Use balanced selector list (try both post and page selectors)
        defaultSelectors = [
          '.blog-post-detail',    // Blog post container
          '.entry-content',       // WordPress/blog entry content
          'article',              // Semantic HTML5 article element
          '.main',                // Dealer.com main content class
          'main',                 // Semantic HTML5 main element
          '#page-body',           // Dealer.com page body container
          '.post-content',        // Blog post specific
          '.ddc-wrapper',         // Dealer.com wrapper
          '.ddc-span8',          // DDC layout specific - main content area
          '.ddc-content',        // DDC container
          '.main-content',        // Common main content class
          '#content',             // Generic content ID
          '.content:not(.nav-fragment):not(.ajax-navigation-element)',  // Content excluding navigation
          '.content',             // Generic content class
          'body'                  // Last resort fallback
        ];
      }
      
      contentSelectors.push(...defaultSelectors);

      for (const selector of contentSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            // CRITICAL: For trusted selectors, use immediately - no validation needed
            // These should contain ALL content regardless of structure
            const trustedSelectors = [
              'main',                 // Semantic HTML5 main element
              '.main',                // Dealer.com main content class (pages)
              '.blog-post-detail',    // Dealer.com blog post container (posts)
              '.entry-content',       // WordPress/blog entry content (posts)
              'article',              // Semantic HTML5 article element (posts)
              '#page-body'            // Dealer.com page body container (pages)
            ];
            
            if (trustedSelectors.includes(selector)) {
              rawContent = await element.innerHTML();
              if (rawContent && rawContent.trim().length > 0) {
                const textLength = await element.evaluate(el => el.textContent?.trim().length || 0);
                const paragraphCount = await element.evaluate(el => el.querySelectorAll('p').length);
                const headingCount = await element.evaluate(el => el.querySelectorAll('h1, h2, h3, h4, h5, h6').length);
                contentFound = true;
                console.log(`   📄 Content found using selector: ${selector} (${textLength} chars, ${paragraphCount} paragraphs, ${headingCount} headings) - using ALL content`);
                break;
              }
            }
            
            // For other selectors, apply validation
            const contentCheck = await element.evaluate(el => {
              const tagName = el.tagName?.toLowerCase();
              const className = (el.getAttribute('class') || '').toLowerCase();
              const id = (el.getAttribute('id') || '').toLowerCase();
              const textContent = el.textContent?.trim() || '';
              
              // Check if it's a nav/header/footer element
              if (tagName === 'nav' || tagName === 'header' || tagName === 'footer') {
                return { isValid: false, reason: 'nav/header/footer element' };
              }
              
              // Check for navigation-related classes/ids
              const navPatterns = /(nav|navigation|menu|header|footer|sidebar|topbar|bottombar|vcard|social-header|socialsm)/;
              if (navPatterns.test(className) || navPatterns.test(id)) {
                return { isValid: false, reason: 'navigation-related class/id' };
              }
              
              // Check if it only contains navigation fragments or minimal content
              const hasNavFragments = el.querySelector('.nav-fragment, .ajax-navigation-element, [data-fragment-id]');
              if (hasNavFragments && textContent.length < 500) {
                return { isValid: false, reason: 'navigation fragments only' };
              }
              
              // Check if it's mostly phone numbers, addresses, or social links (header content)
              const phonePattern = /\(\d{3}\)\s*\d{3}[-.]?\d{4}/g;
              const phoneMatches = (textContent.match(phonePattern) || []).length;
              const hasAddress = /^\d+\s+[A-Z\s]+(?:ST|STREET|AVE|AVENUE|DR|DRIVE|RD|ROAD|BLVD|BOULEVARD)/i.test(textContent);
              const socialLinkCount = el.querySelectorAll('a[href*="facebook"], a[href*="instagram"], a[href*="tiktok"], a[href*="linkedin"]').length;
              
              // If it's mostly header content (phones, address, social) and has little other text, skip it
              if ((phoneMatches >= 2 || hasAddress || socialLinkCount >= 2) && textContent.length < 300) {
                return { isValid: false, reason: 'header content (phones/address/social)' };
              }
              
              // Check for substantial text content (at least 500 chars for text-only content)
              const hasSubstantialText = textContent.length > 500;
              
              // Check for multiple paragraphs or headings (indicates real content)
              const paragraphCount = el.querySelectorAll('p').length;
              const headingCount = el.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
              const hasContentStructure = paragraphCount >= 2 || headingCount >= 1;
              
              // Valid if it has BOTH substantial text AND proper content structure
              // OR very substantial text (1000+ chars) even without structure
              const isValid = (hasSubstantialText && hasContentStructure) || textContent.length > 1000;
              
              return {
                isValid,
                reason: isValid ? 'valid content' : 'insufficient content',
                textLength: textContent.length,
                paragraphCount,
                headingCount
              };
            });
            
            if (!contentCheck.isValid) {
              console.log(`   ⏭️  Skipping selector ${selector}: ${contentCheck.reason}`);
              continue;
            }
            
            rawContent = await element.innerHTML();
            
            // Additional check: if content seems incomplete (too short), try to find a larger container
            // This helps when a smaller container matches but doesn't have all content
            if (rawContent && rawContent.trim().length > 100) {
              // For non-main selectors, verify we have substantial content
              // If we got less than 2000 chars, it might be incomplete - but still use it if it's the best we have
              if (selector !== 'main' && contentCheck.textLength < 2000) {
                // Check if this seems like it might be incomplete by looking for common page structure
                const hasMultipleSections = await element.evaluate(el => {
                  const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
                  return headings.length >= 2; // Multiple headings suggest multiple sections
                });
                
                if (!hasMultipleSections && selector !== 'body') {
                  console.log(`   ⚠️  Selector ${selector} may be incomplete (${contentCheck.textLength} chars, ${contentCheck.headingCount} headings) - continuing search...`);
                  // Don't break, continue to find a better match
                  continue;
                }
              }
              
              contentFound = true;
              console.log(`   📄 Content found using selector: ${selector} (${contentCheck.textLength} chars, ${contentCheck.paragraphCount} paragraphs, ${contentCheck.headingCount} headings)`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!rawContent || rawContent.trim().length < 100) {
        throw new ScraperError(`No meaningful content found on ${url}`);
      }

      // Clean the HTML content
      const cleanContent = this._cleanHTML(rawContent);
      const originalSize = rawContent.length;
      const cleanedSize = cleanContent.length;
      const reduction = ((originalSize - cleanedSize) / originalSize * 100).toFixed(1);

      console.log(`   📏 Content: ${(cleanedSize / 1024).toFixed(1)}KB (${reduction}% reduction)`);

      // Generate filename and save content
      const filename = this._generateFilename(url);
      const outputPath = config.resolvePath(`${this.config.outputDir}/${filename}.html`);
      
      // Ensure output directory exists
      await fs.ensureDir(config.resolvePath(this.config.outputDir));
      await fs.writeFile(outputPath, cleanContent, 'utf-8');

      return {
        url,
        filename: `${filename}.html`,
        contentSize: `${(cleanedSize / 1024).toFixed(1)}KB`,
        reduction: `${reduction}%`,
        contentFound,
        status,
        success: true
      };

    } catch (error) {
      throw new ScraperError(`Failed to scrape ${url}: ${error.message}`, error);
    } finally {
      await context.close();
    }
  }

  /**
   * Scrape multiple URLs
   * @param {Array<string>} urls - URLs to scrape
   * @returns {Promise<Object>} Scraping results summary
   */
  async scrapeUrls(urls = null) {
    try {
      // Load URLs if not provided
      if (!urls) {
        urls = await this.loadUrls();
      }

      if (urls.length === 0) {
        throw new ScraperError('No URLs to scrape');
      }

      console.log(`🚀 Starting HTML scraping for ${urls.length} URLs`);
      
      // Initialize browser
      await this._initBrowser();

      const results = [];
      const errors = [];
      const progress = new ProgressTracker(urls.length, 'Scraping URLs');

      // Process URLs sequentially to avoid overwhelming the target server
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\n🎯 Scraping ${i + 1}/${urls.length}: ${url}`);

        try {
          const result = await retry(
            () => this._scrapeSingleUrl(url),
            this.config.maxRetries
          );
          
          results.push(result);
          progress.update(1, `✅ ${result.filename}`);

        } catch (error) {
          const errorInfo = handleError(error, { url, index: i });
          errors.push(errorInfo);
          progress.update(1, '❌ Failed');
          console.error(`   ❌ ${errorInfo.userMessage}`);
        }

        // Progress checkpoint for large batches
        if ((i + 1) % 10 === 0 && urls.length > 20) {
          console.log(`\n📊 Progress checkpoint: ${i + 1}/${urls.length} completed (${((i + 1) / urls.length * 100).toFixed(1)}%)`);
        }
      }

      progress.complete();

      // Save results summary
      const summary = {
        timestamp: new Date().toISOString(),
        totalUrls: urls.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.slice(0, 10) // Limit error details
      };

      const summaryPath = config.resolvePath(`${this.config.outputDir}/summary.json`);
      await writeJSON(summaryPath, summary);

      // Save URL mappings for slug generation
      await this._saveUrlMappings(results);

      return summary;

    } finally {
      await this.cleanup();
    }
  }

  /**
   * Save URL mappings for accurate slug generation
   * @private
   * @param {Array<Object>} results - Scraping results
   * @returns {Promise<void>}
   */
  async _saveUrlMappings(results) {
    try {
      const mappings = {};
      
      results.forEach(result => {
        if (result.url && result.filename && result.success) {
          const urlObject = new URL(result.url);
          const originalPath = urlObject.pathname;
          const key = result.filename.replace('.html', '');
          
          mappings[key] = {
            originalUrl: result.url,
            originalPath: originalPath,
            domain: urlObject.hostname
          };
        }
      });
      
      if (Object.keys(mappings).length > 0) {
        const dataConfig = config.get('data');
        await writeJSON(config.resolvePath(dataConfig.urlMappings), mappings);
        console.log(`🔗 Saved ${Object.keys(mappings).length} URL mappings for slug generation`);
      }
    } catch (error) {
      console.warn('Could not save URL mappings:', error.message);
    }
  }

  /**
   * Check if scraped content already exists
   * @returns {Promise<number>} Number of existing HTML files
   */
  async checkExistingContent() {
    const outputDir = config.resolvePath(this.config.outputDir);
    const htmlFiles = await getFiles(outputDir, '.html');
    return htmlFiles.length;
  }
}
