/**
 * @fileoverview WordPress CSV generator service for Really Simple CSV Importer
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import { JSDOM } from 'jsdom';
import config from '../config/index.js';
import { CSVGenerationError, handleError, ProgressTracker } from '../utils/errors.js';
import { readJSON, writeJSON, getFiles, ensureDir, exists } from '../utils/filesystem.js';

/**
 * WordPress CSV Generator Service
 * Generates CSV files compatible with Really Simple CSV Importer plugin
 */
export class CSVGeneratorService {
  constructor(options = {}) {
    this.config = { ...config.get('csv'), ...options };
  }

  /**
   * Escape CSV special characters and ensure all fields are quoted
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped and quoted text
   */
  _escapeCSV(text) {
    if (!text) return '""';
    // Convert to string and escape quotes by doubling them
    const str = String(text).replace(/"/g, '""');
    // Always quote all fields as required by Really Simple CSV Importer
    return `"${str}"`;
  }

  /**
   * Extract article date from HTML content
   * Looks for date elements with common class names and parses various date formats
   * @private
   * @param {string} html - HTML content
   * @returns {string|null} Extracted date in MySQL format (YYYY-MM-DD HH:MM:SS) or null
   */
  _extractArticleDate(html) {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Common date selectors - ordered by specificity
      const dateSelectors = [
        '.article-date',
        '.post-date',
        '.published',
        '.date',
        '.entry-date',
        '.publish-date',
        'time[datetime]',
        '[class*="date"]',
        '[class*="published"]'
      ];
      
      for (const selector of dateSelectors) {
        const element = document.querySelector(selector);
        if (!element) continue;
        
        // Try to get date from datetime attribute (most reliable)
        if (element.hasAttribute('datetime')) {
          const datetime = element.getAttribute('datetime');
          const parsed = this._parseDate(datetime);
          if (parsed) return parsed;
        }
        
        // Try to parse from text content
        const textContent = element.textContent.trim();
        if (textContent) {
          const parsed = this._parseDate(textContent);
          if (parsed) return parsed;
        }
      }
      
      return null;
      
    } catch (error) {
      console.warn(`Error extracting article date: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse various date formats and return MySQL datetime format
   * @private
   * @param {string} dateString - Date string to parse
   * @returns {string|null} Date in MySQL format (YYYY-MM-DD HH:MM:SS) or null
   */
  _parseDate(dateString) {
    if (!dateString) return null;
    
    try {
      // Common date patterns to match
      const patterns = [
        // ISO 8601: 2023-03-08T00:00:00 or 2023-03-08
        /(\d{4})-(\d{2})-(\d{2})(T|\s+)?(\d{2}:\d{2}:\d{2})?/,
        // US format: March 8, 2023 or 03/08/2023
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        // European format: 8 March 2023
        /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i
      ];
      
      // Try ISO format first (most reliable)
      const isoMatch = dateString.match(patterns[0]);
      if (isoMatch) {
        const [, year, month, day, , time] = isoMatch;
        const timeStr = time || '00:00:00';
        return `${year}-${month}-${day} ${timeStr}`;
      }
      
      // Try month name formats
      const monthNameMatch = dateString.match(patterns[1]);
      if (monthNameMatch) {
        const [, monthName, day, year] = monthNameMatch;
        const monthMap = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        const month = monthMap[monthName.toLowerCase()];
        const paddedDay = String(day).padStart(2, '0');
        return `${year}-${month}-${paddedDay} 00:00:00`;
      }
      
      // Try US numeric format (MM/DD/YYYY)
      const usDateMatch = dateString.match(patterns[2]);
      if (usDateMatch) {
        const [, month, day, year] = usDateMatch;
        const paddedMonth = String(month).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay} 00:00:00`;
      }
      
      // Try European format (DD Month YYYY)
      const euDateMatch = dateString.match(patterns[3]);
      if (euDateMatch) {
        const [, day, monthName, year] = euDateMatch;
        const monthMap = {
          'january': '01', 'february': '02', 'march': '03', 'april': '04',
          'may': '05', 'june': '06', 'july': '07', 'august': '08',
          'september': '09', 'october': '10', 'november': '11', 'december': '12'
        };
        const month = monthMap[monthName.toLowerCase()];
        const paddedDay = String(day).padStart(2, '0');
        return `${year}-${month}-${paddedDay} 00:00:00`;
      }
      
      // Last resort: try JavaScript Date parser
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract title from HTML content
   * @private
   * @param {string} html - HTML content
   * @param {string} filename - Fallback filename
   * @returns {string} Extracted title
   */
  _extractTitle(html, filename) {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Try multiple selectors for title
      const titleSelectors = [
        'h1',
        '.title',
        '.post-title',
        '.article-title',
        '.page-title',
        'title'
      ];
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      
      // Fallback to filename
      return filename
        .replace('.html', '')
        .replace(/^www\./, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
        
    } catch (error) {
      console.warn(`Error extracting title from ${filename}: ${error.message}`);
      return filename.replace('.html', '').replace(/_/g, ' ');
    }
  }

  /**
   * Generate slug from filename preserving original URL structure
   * @private
   * @param {string} filename - HTML filename (e.g., www.delrayhyundai.com_2025-Hyundai-IONIQ9-vs-2025-Kia-EV9.html)
   * @param {string} title - Content title (unused, kept for compatibility)
   * @returns {string} URL-friendly slug extracted from original URL
   */
  _generateSlug(filename, title) {
    // Extract the original URL path from filename
    // Filename format: domain_path-parts.html (or .html.html for double extensions)
    // Example: www.essentialford.com_2025-ford-expedition-vs-2025-jeep-wagoneer-.html.html
    
    // Remove all .html extensions (handles both .html and .html.html cases)
    let baseFilename = filename;
    while (baseFilename.endsWith('.html')) {
      baseFilename = baseFilename.slice(0, -5); // Remove '.html'
    }
    
    const parts = baseFilename.split('_');
    
    if (parts.length < 2) {
      // Fallback to cleaned filename if pattern doesn't match
      return baseFilename
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
    
    // Find where domain ends (look for .com, .org, etc.)
    let domainEndIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(/^(com|org|net|edu|gov|co|io)$/)) {
        domainEndIndex = i;
        break;
      }
    }
    
    // If no TLD found, check if first part looks like a full domain
    if (domainEndIndex === -1) {
      if (parts.length >= 2 && parts[0].includes('.') && parts[0].match(/\.(com|org|net|edu|gov|co|io)$/)) {
        // First part is a full domain like "www.example.com"
        domainEndIndex = 0;
      } else if (parts.length >= 3 && parts[0] === 'www') {
        // Traditional www.domain.com split format
        domainEndIndex = 2;
      } else {
        // Fallback: assume first part is domain
        domainEndIndex = Math.min(1, parts.length - 2);
      }
    }
    
    // Extract path parts after domain
    let pathParts = parts.slice(domainEndIndex + 1);
    
    // Remove any file extension parts that might have slipped through
    pathParts = pathParts.filter(part => !part.match(/^(html?|php|asp|jsp)$/i));
    
    if (pathParts.length === 0) {
      // No path found, use title or filename as fallback
      if (title && title.length > 3) {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      return baseFilename;
    }
    
    // Rejoin path parts and ensure it's URL-friendly
    return pathParts.join('_')
      .toLowerCase()
      .replace(/_/g, '-')           // Convert underscores back to hyphens
      .replace(/[^a-z0-9-]/g, '-')  // Replace any other chars with hyphens  
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '')        // Remove leading/trailing hyphens
      .substring(0, 255);           // Increased to match filesystem limits
  }

  /**
   * Detect content type (post vs page) using custom selectors or content analysis
   * @private
   * @param {string} html - HTML content
   * @param {string} filename - Filename for context
   * @param {Object} contentTypeMappings - Manual content type mappings
   * @param {Object} customSelectors - User-defined CSS selectors for detection
   * @returns {Object} Detection result with type, confidence, and reason
   */
  _detectContentType(html, filename, contentTypeMappings, customSelectors = null) {
    // Check manual mappings first
    if (contentTypeMappings && contentTypeMappings[filename]) {
      return {
        type: contentTypeMappings[filename],
        confidence: 100,
        reason: 'Manual mapping'
      };
    }

    // Use custom selectors if provided
    if (customSelectors) {
      try {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Helper function to convert plain class names to CSS selectors
        const normalizeSelector = (selector) => {
          if (!selector) return selector;
          
          // If it doesn't start with . # [ or contain spaces/special chars, treat as class name
          if (!/^[.#\[]/.test(selector) && !/[\s>+~\[]/.test(selector)) {
            return `.${selector}`;
          }
          return selector;
        };

        // Check for post selector
        if (customSelectors.post) {
          const postSelector = normalizeSelector(customSelectors.post);
          const postElements = document.querySelectorAll(postSelector);
          
          if (postElements.length > 0) {
            return { 
              type: 'post', 
              confidence: 95, 
              reason: `Found post class: ${customSelectors.post} (${postElements.length} elements)` 
            };
          }
        }

        // Check for page selector
        if (customSelectors.page) {
          const pageSelector = normalizeSelector(customSelectors.page);
          const pageElements = document.querySelectorAll(pageSelector);
          
          if (pageElements.length > 0) {
            return { 
              type: 'page', 
              confidence: 95, 
              reason: `Found page class: ${customSelectors.page} (${pageElements.length} elements)` 
            };
          }
        }

        // FIXED LOGIC: If post selector is defined but not found, default to page
        if (customSelectors.post && !customSelectors.page) {
          console.log(`   📄 Post class '${customSelectors.post}' not found in ${filename}, defaulting to page`);
          return { type: 'page', confidence: 80, reason: `Post class not found, defaulting to page` };
        }

        // If page selector is defined but not found, default to post
        if (customSelectors.page && !customSelectors.post) {
          console.log(`   📝 Page class '${customSelectors.page}' not found in ${filename}, defaulting to post`);
          return { type: 'post', confidence: 80, reason: `Page class not found, defaulting to post` };
        }

        // If both selectors defined but neither found, use automatic detection
        if (customSelectors.post && customSelectors.page) {
          console.log(`   ⚠️  Both custom classes provided but not found in ${filename}, using automatic detection`);
        }
      } catch (error) {
        console.warn(`Error checking custom selectors for ${filename}:`, error.message);
      }
    }

    // Fallback to automatic content analysis
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const textContent = document.body.textContent.toLowerCase();
      
      // Post indicators
      const postIndicators = [
        'posted on', 'published on', 'by author', 'read more',
        'comments', 'share this', 'tags:', 'category:',
        'article', 'blog post'
      ];
      
      // Page indicators  
      const pageIndicators = [
        'about us', 'contact us', 'privacy policy', 'terms',
        'services', 'products', 'home page', 'main page'
      ];
      
      let postScore = 0;
      let pageScore = 0;
      
      postIndicators.forEach(indicator => {
        if (textContent.includes(indicator)) postScore++;
      });
      
      pageIndicators.forEach(indicator => {
        if (textContent.includes(indicator)) pageScore++;
      });
      
      if (postScore > pageScore) {
        return { type: 'post', confidence: 60 + (postScore * 10), reason: 'Content analysis (post indicators)' };
      } else if (pageScore > postScore) {
        return { type: 'page', confidence: 60 + (pageScore * 10), reason: 'Content analysis (page indicators)' };
      }
      
      // Default to post if uncertain
      return { type: 'post', confidence: 50, reason: 'Default (uncertain)' };
      
    } catch (error) {
      console.warn(`Error analyzing content type for ${filename}: ${error.message}`);
      return { type: 'post', confidence: 30, reason: 'Error fallback' };
    }
  }

  /**
   * Prepare HTML content for CSV (processor should have already cleaned it)
   * @private
   * @param {string} html - Pre-cleaned HTML content from processor
   * @returns {string} HTML content ready for CSV
   */
  _cleanContentForCSV(html) {
    // The processor should have already cleaned the HTML completely
    // CSV generator should only handle CSV formatting, not HTML cleaning
    if (!html || html.trim() === '') {
      return '';
    }
    
    // Return the HTML as-is since processor should have handled all cleaning
    return html.trim();
  }


  /**
   * Extract excerpt from HTML content
   * @private
   * @param {string} htmlContent - HTML content
   * @returns {string} Plain text excerpt (first 150 characters)
   */
  _extractExcerpt(htmlContent) {
    if (!htmlContent) return '';
    
    try {
      // Convert HTML to plain text for excerpt
      const dom = new JSDOM(htmlContent);
      const textContent = dom.window.document.body.textContent || '';
      
      // Get first paragraph or first 150 characters
      const firstParagraph = textContent.split('\n')[0];
      const excerpt = firstParagraph.length > 150 
        ? firstParagraph.substring(0, 147) + '...'
        : firstParagraph;
      
      return excerpt.trim();
    } catch (error) {
      // Fallback: strip HTML manually
      const plainText = htmlContent.replace(/<[^>]*>/g, '');
      return plainText.length > 150 
        ? plainText.substring(0, 147) + '...'
        : plainText;
    }
  }

  /**
   * Process single HTML file and extract data for CSV
   * @private
   * @param {string} filename - HTML filename
   * @param {Object} contentTypeMappings - Content type mappings
   * @param {Object} customSelectors - Custom CSS selectors
   * @returns {Promise<Object>} Processed item data
   */
  async _processHtmlFile(filename, contentTypeMappings, customSelectors) {
    const scrapedPath = path.join(config.resolvePath('output/scraped-content'), filename);
    const cleanPath = path.join(config.resolvePath('output/clean-content'), filename);
    
    try {
      // Read original scraped HTML for content type detection (has article-header class)
      const originalHtml = await fs.readFile(scrapedPath, 'utf-8');
      
      // IMPORTANT: Detect content type using original scraped HTML
      // This must happen before sanitization removes the custom classes
      const contentType = this._detectContentType(originalHtml, filename, contentTypeMappings, customSelectors);
      
      // Extract title from original HTML
      const title = this._extractTitle(originalHtml, filename);
      
      // Generate slug
      const slug = this._generateSlug(filename, title);
      
      // Read processed HTML for content (has updated links but no custom classes)
      let processedHtml;
      try {
        processedHtml = await fs.readFile(cleanPath, 'utf-8');
        console.log(`   📄 Using processed HTML with updated links from clean-content/`);
      } catch (error) {
        // Fallback to original if clean-content doesn't exist
        processedHtml = originalHtml;
        console.log(`   ⚠️  clean-content not found, using original HTML`);
      }
      
      // Clean content (preserve HTML formatting) - use processed HTML with updated links
      const cleanContent = this._cleanContentForCSV(processedHtml);
      
      // Extract excerpt (plain text)
      const excerpt = this._extractExcerpt(cleanContent);
      
      // Try to extract article date from original HTML (before classes were removed)
      const articleDate = this._extractArticleDate(originalHtml);
      
      // Use article date if found, otherwise use current date
      const postDate = articleDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Log if we found an article date
      if (articleDate) {
        console.log(`   📅 Found article date: ${articleDate}`);
      }
      
      return {
        post_title: title,
        post_content: cleanContent,
        post_type: contentType.type,
        post_status: 'publish',
        post_date: postDate,
        post_name: slug,
        post_excerpt: excerpt,
        post_category: contentType.type === 'post' ? 'Uncategorized' : '',
        post_tags: '',
        filename: filename,
        detection_confidence: contentType.confidence,
        detection_reason: contentType.reason
      };
      
    } catch (error) {
      console.error(`Error processing ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate CSV file from processed HTML content
   * @returns {Promise<Object>} Generation results
   */
  async generateCSV() {
    try {
      console.log('📝 Starting WordPress CSV Generator');
      console.log(`📁 Input: ${this.config.inputDir}/`);
      console.log(`💾 Output: ${this.config.outputDir}/`);

      // Check input directories
      const scrapedDir = config.resolvePath('output/scraped-content');
      const cleanDir = config.resolvePath('output/clean-content');
      
      const scrapedExists = await exists(scrapedDir);
      const cleanExists = await exists(cleanDir);
      
      if (!cleanExists && !scrapedExists) {
        throw new CSVGenerationError(`No content directories found. Run the scraper and processor first!`);
      }
      
      // Prefer clean content over scraped content
      const inputDir = cleanExists ? cleanDir : scrapedDir;
      const inputType = cleanExists ? 'clean-content (processed)' : 'scraped-content (original)';
      
      console.log(`📁 Using: ${inputType}/`);
      
      if (!cleanExists) {
        console.log('⚠️  WARNING: Using original scraped content - run processor first for clean content!');
      }

      // Get HTML files from the appropriate directory
      const htmlFiles = await getFiles(inputDir, '.html');

      if (htmlFiles.length === 0) {
        throw new CSVGenerationError(`No HTML files found in ${this.config.inputDir}`);
      }

      console.log(`📄 Found ${htmlFiles.length} HTML files to process`);

      // Load mappings and custom selectors
      const dataConfig = config.get('data');
      let contentTypeMappings = {};
      
      try {
        const contentTypeFile = config.resolvePath(dataConfig.contentTypeMappings);
        if (await exists(contentTypeFile)) {
          contentTypeMappings = await readJSON(contentTypeFile, {});
          console.log(`📋 Loaded ${Object.keys(contentTypeMappings).length} content type mappings`);
        }
      } catch (error) {
        console.log('📋 No content type mappings found - using automatic detection');
      }

      // Load custom selectors - always get fresh from config to ensure updates are seen
      const customSelectors = config.get('csv').customSelectors;
      if (customSelectors) {
        console.log('🎯 Using custom selectors for content type detection');
        console.log(`   📝 Post selector: ${customSelectors.post || 'none'}`);
        console.log(`   📄 Page selector: ${customSelectors.page || 'none'}`);
      } else {
        console.log('📋 No custom selectors found - using automatic content detection');
      }

      // Process all HTML files
      const items = [];
      const progress = new ProgressTracker(htmlFiles.length, 'Processing HTML files');
      
      for (const filename of htmlFiles) {
        const item = await this._processHtmlFile(filename, contentTypeMappings, customSelectors);
        items.push(item);
        progress.update(1, `${item.post_type}: ${item.post_title.substring(0, 30)}...`);
      }
      
      progress.complete();

      // Count posts and pages
      const posts = items.filter(item => item.post_type === 'post');
      const pages = items.filter(item => item.post_type === 'page');

      console.log('\n📊 Content Summary:');
      console.log(`   📝 Posts: ${posts.length}`);
      console.log(`   📄 Pages: ${pages.length}`);
      console.log(`   📦 Total items: ${items.length}`);

      // Ensure output directory exists
      const outputDir = config.resolvePath(this.config.outputDir);
      await ensureDir(outputDir);

      // Generate CSV content with proper UTF-8 encoding and quoted fields
      const csvHeaders = [
        'post_title',
        'post_content', 
        'post_type',
        'post_status',
        'post_date',
        'post_name',
        'post_excerpt',
        'post_category'
      ];

      // Create header row with all fields quoted
      let csvContent = csvHeaders.map(header => this._escapeCSV(header)).join(',') + '\n';

      for (const item of items) {
        const row = csvHeaders.map(header => this._escapeCSV(item[header] || '')).join(',');
        csvContent += row + '\n';
      }

      // Write CSV file with UTF-8 encoding
      const outputPath = config.resolvePath(`${this.config.outputDir}/${this.config.outputFile}`);
      await fs.writeFile(outputPath, csvContent, 'utf-8');

      const fileSize = Buffer.byteLength(csvContent, 'utf8');
      console.log(`📄 Generated: ${this.config.outputFile} (${items.length} items, ${(fileSize / 1024).toFixed(1)}KB)`);

      // Generate summary
      const summary = {
        timestamp: new Date().toISOString(),
        totalFiles: htmlFiles.length,
        posts: posts.length,
        pages: pages.length,
        processedItems: items.length,
        generatedFiles: 1,
        outputFile: this.config.outputFile,
        fileSize: fileSize,
        fileSizeFormatted: `${(fileSize / 1024).toFixed(1)}KB`,
        items: items.map(item => ({
          filename: item.filename,
          title: item.post_title,
          type: item.post_type,
          confidence: item.detection_confidence,
          reason: item.detection_reason
        }))
      };

      const summaryPath = config.resolvePath(`${this.config.outputDir}/generation-summary.json`);
      await writeJSON(summaryPath, summary);

      console.log('\n📊 CSV GENERATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`✅ Generated: ${this.config.outputFile}`);
      console.log(`📦 Items: ${items.length} (${posts.length} posts, ${pages.length} pages)`);
      console.log(`📏 File size: ${(fileSize / 1024).toFixed(1)}KB`);

      return summary;

    } catch (error) {
        throw new CSVGenerationError('CSV generation failed', null, error);
    }
  }
}