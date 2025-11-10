/**
 * @fileoverview HTML content scraping service
 * @author Content Automation Team
 * @version 1.0.0
 */

import { chromium } from 'playwright';
import fs from 'fs-extra';
import config from '../config/index.js';
import { ScraperError, handleError, retry, ProgressTracker } from '../utils/errors.js';
import { readJSON, writeJSON, getFiles } from '../utils/filesystem.js';

/**
 * HTML Scraper Service
 * Handles web scraping operations with robust error handling and retry logic
 */
export class HTMLScraperService {
  constructor(options = {}) {
    this.config = { ...config.get('scraper'), ...options };
    this.browser = null;
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

      // Try multiple content selectors in order of preference
      const contentSelectors = [
        '#content',
        'main',
        '.content',
        '.main-content',
        'article',
        '.post-content',
        '.entry-content',
        'body'
      ];

      for (const selector of contentSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            rawContent = await element.innerHTML();
            if (rawContent && rawContent.trim().length > 100) {
              contentFound = true;
              console.log(`   📄 Content found using selector: ${selector}`);
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
          progress.update(1, `❌ Failed`);
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
