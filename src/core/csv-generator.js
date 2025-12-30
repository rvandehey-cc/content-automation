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
    // Store explicit content type from user selection (UI or CLI)
    // If user selects "page" or "post"/"blog", this should override detection
    this.explicitContentType = options.contentType || null;
    this.contentType = this.explicitContentType || this.config.contentType || 'post';
    this.blogPostSelectors = options.blogPostSelectors || this.config.blogPostSelectors || null;
  }

  // Constants for reuse
  static MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december',
                   'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  
  static FOLDER_PREFIXES = ['blog', 'blogs', 'post', 'posts', 'page', 'pages', 'article', 'articles'];
  
  static FILE_EXTENSIONS = /^(html?|php|asp|jsp|htm)$/i;

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
   * Wrap HTML fragment in document structure for JSDOM parsing
   * @private
   * @param {string} html - HTML content (may be fragment)
   * @returns {string} Full HTML document
   */
  _wrapHtmlForParsing(html) {
    const htmlToParse = html.trim();
    if (!htmlToParse.includes('<html') && !htmlToParse.includes('<body')) {
      return `<html><body>${htmlToParse}</body></html>`;
    }
    return htmlToParse;
  }

  /**
   * Remove blog prefixes from title text
   * @private
   * @param {string} title - Title text
   * @returns {string} Cleaned title
   */
  _removeBlogPrefix(title) {
    return title
      .replace(/^blog\s*[:-]\s*/i, '')  // Remove "Blog:" or "Blog -" at start
      .replace(/^blog\s+/i, '')         // Remove "Blog " at start
      .trim();
  }

  /**
   * Normalize text to slug format
   * @private
   * @param {string} text - Text to normalize
   * @returns {string} URL-friendly slug
   */
  _normalizeSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')  // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  }

  /**
   * Remove file extensions from filename
   * @private
   * @param {string} filename - Filename with extensions
   * @returns {string} Filename without extensions
   */
  _removeFileExtensions(filename) {
    let cleaned = filename;
    while (cleaned.endsWith('.html') || cleaned.endsWith('.htm')) {
      cleaned = cleaned.endsWith('.html') ? cleaned.slice(0, -5) : cleaned.slice(0, -4);
    }
    return cleaned.replace(/[-_]htm$/i, '').replace(/[-_]html$/i, '');
  }

  /**
   * Remove malformed tags and imgnone from HTML string
   * @private
   * @param {string} html - HTML content
   * @returns {string} Cleaned HTML
   */
  _removeMalformedTags(html) {
    return html
      .replace(/<imgnone[^>]*>/gi, '')
      .replace(/<\/imgnone[^>]*>/gi, '')
      .replace(/<[^>]*imgnone[^>]*>/gi, '')
      .replace(/<[^<>\s]+'"[^>]*>/gi, '')  // Tags like <tag'">
      .replace(/<\/[^<>\s]+'"[^>]*>/gi, '') // Closing tags like </tag'">
      .replace(/imgnone/gi, '');
  }

  /**
   * Find domain end index in filename parts
   * @private
   * @param {Array<string>} parts - Filename parts split by underscore
   * @returns {number} Index where domain ends
   */
  _findDomainEndIndex(parts) {
    // Look for TLD (.com, .org, etc.)
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].match(/^(com|org|net|edu|gov|co|io)$/)) {
        return i;
      }
    }
    
    // Check if first part is full domain
    if (parts.length >= 2 && parts[0].includes('.') && parts[0].match(/\.(com|org|net|edu|gov|co|io)$/)) {
      return 0;
    }
    
    // Traditional www.domain.com format
    if (parts.length >= 3 && parts[0] === 'www') {
      return 2;
    }
    
    // Fallback
    return Math.min(1, parts.length - 2);
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
   * H1 from scraped-content is the primary source for post/page title
   * @private
   * @param {string} html - HTML content (should be from output/scraped-content/)
   * @param {string} filename - Fallback filename
   * @returns {string} Extracted title
   */
  /**
   * Extract and clean title text from element
   * @private
   * @param {Element} element - DOM element
   * @returns {string|null} Cleaned title or null
   */
  _extractTitleFromElement(element) {
    if (!element || !element.textContent) return null;
    const text = element.textContent.trim().replace(/\s+/g, ' ').trim();
    return text.length > 3 ? this._removeBlogPrefix(text) : null;
  }

  _extractTitle(html, filename) {
    try {
      const dom = new JSDOM(this._wrapHtmlForParsing(html));
      const document = dom.window.document;
      
      // PRIMARY: H1 is the definitive post/page title from scraped content
      const h1Elements = document.querySelectorAll('h1');
      for (const h1Element of h1Elements) {
        const cleanedTitle = this._extractTitleFromElement(h1Element);
        if (cleanedTitle) {
          console.log(`   📝 Extracted title from H1: "${cleanedTitle.substring(0, 60)}${cleanedTitle.length > 60 ? '...' : ''}"`);
          return cleanedTitle;
        }
      }
      
      // Log warning
      if (h1Elements.length > 0) {
        console.warn(`   ⚠️  H1 found in ${filename} but it's empty or too short`);
      } else {
        console.warn(`   ⚠️  No H1 found in ${filename}, trying fallback selectors...`);
      }
      
      // Fallback selectors
      const fallbackSelectors = ['.title', '.post-title', '.article-title', '.page-title', '.entry-title', 'title'];
      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        const fallbackTitle = this._extractTitleFromElement(element);
        if (fallbackTitle) {
          console.warn(`   ⚠️  Using ${selector} as fallback: "${fallbackTitle.substring(0, 60)}${fallbackTitle.length > 60 ? '...' : ''}"`);
          return fallbackTitle;
        }
      }
      
      // Try to extract from filename
      const filenameTitle = this._extractTitleFromFilename(filename);
      if (filenameTitle && filenameTitle.length > 10 && /[a-z]/.test(filenameTitle)) {
        const titleFromFilename = filenameTitle
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        console.warn(`   ⚠️  Using filename-derived title: "${titleFromFilename.substring(0, 60)}${titleFromFilename.length > 60 ? '...' : ''}"`);
        return titleFromFilename;
      }
      
      // Final fallback
      console.warn(`   ⚠️  No title found in ${filename}, using filename as fallback`);
      const cleaned = this._removeFileExtensions(filename)
        .replace(/^www\./, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return cleaned;
        
    } catch (error) {
      console.warn(`Error extracting title from ${filename}: ${error.message}`);
      return this._removeFileExtensions(filename).replace(/_/g, ' ');
    }
  }

  /**
   * Extract title-like text from filename
   * @private
   * @param {string} filename - Filename to extract from
   * @returns {string} Extracted title text
   */
  _extractTitleFromFilename(filename) {
    return this._removeFileExtensions(filename)
      .replace(/^www\./, '')
      .replace(/^[^_]+_/, '') // Remove domain part
      .replace(/_\d{4}_[a-z]+_\d{1,2}_/i, '') // Remove date patterns
      .replace(/^blog/i, '')
      .replace(/^post_/i, '')
      .replace(/_/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Generate slug from filename preserving original URL structure
   * Removes domain, path prefixes (blog, date folders), and file extensions
   * @private
   * @param {string} filename - HTML filename (e.g., www.nissanofstockton.com_blog_2025_october_11_youll-love-the-tech-packed-2025-nissan-sentra.htm.html)
   * @param {string} title - Content title (unused, kept for compatibility)
   * @returns {string} URL-friendly slug with only the actual page/post name
   */
  /**
   * Remove date patterns from path parts
   * @private
   * @param {Array<string>} pathParts - Path segments
   * @returns {Array<string>} Path segments with dates removed
   */
  _removeDatePatterns(pathParts) {
    const months = CSVGeneratorService.MONTHS;
    
    while (pathParts.length >= 3) {
      const [part0, part1, part2] = pathParts.map(p => p.toLowerCase());
      
      // Year-month-day pattern (e.g., 2025, october, 11)
      if (part0.match(/^\d{4}$/) && months.includes(part1) && part2.match(/^\d{1,2}$/)) {
        pathParts.splice(0, 3);
        continue;
      }
      
      // Year-month pattern (e.g., 2025, october)
      if (part0.match(/^\d{4}$/) && months.includes(part1)) {
        pathParts.splice(0, 2);
        continue;
      }
      
      // Year-month numeric (e.g., 2025, 07)
      if (part0.match(/^\d{4}$/) && part1.match(/^\d{1,2}$/)) {
        pathParts.splice(0, 2);
        continue;
      }
      
      break; // No more date patterns
    }
    
    return pathParts;
  }

  _generateSlug(filename, title) {
    const baseFilename = this._removeFileExtensions(filename);
    const parts = baseFilename.split('_');
    
    if (parts.length < 2) {
      return this._normalizeSlug(baseFilename);
    }
    
    // Extract path parts after domain
    const domainEndIndex = this._findDomainEndIndex(parts);
    let pathParts = parts.slice(domainEndIndex + 1);
    
    // Remove folder prefixes
    while (pathParts.length > 0 && CSVGeneratorService.FOLDER_PREFIXES.includes(pathParts[0].toLowerCase())) {
      pathParts.shift();
    }
    
    // Remove numeric IDs
    while (pathParts.length > 0 && pathParts[0].match(/^\d+$/)) {
      pathParts.shift();
    }
    
    // Remove date patterns
    pathParts = this._removeDatePatterns(pathParts);
    
    // Filter to keep only segments with letters
    pathParts = pathParts.filter(part => 
      !part.match(/^\d+$/) && 
      !part.match(CSVGeneratorService.FILE_EXTENSIONS) && 
      /[a-z]/i.test(part)
    );
    
    // Take ONLY the last segment
    const finalSlug = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
    
    if (!finalSlug || finalSlug.length < 3) {
      return title && title.length > 3 
        ? this._normalizeSlug(title)
        : this._normalizeSlug(baseFilename);
    }
    
    // Clean and normalize final slug
    let slug = this._normalizeSlug(finalSlug);
    slug = slug.replace(/-htm$/i, '').replace(/-html$/i, '');
    
    return slug.substring(0, 255);
  }

  /**
   * Detect content type (post vs page) using custom selectors or content analysis
   * @private
   * @param {string} html - HTML content
   * @param {string} filename - Filename for context
   * @param {Object} contentTypeMappings - Manual content type mappings
   * @param {Object} customSelectors - User-defined CSS selectors for detection
   * @param {Object} urlMappings - URL mappings for URL-based detection
   * @returns {Object} Detection result with type, confidence, and reason
   */
  _detectContentType(html, filename, contentTypeMappings, customSelectors = null, urlMappings = {}) {
    // PRIORITY 1: Check manual mappings first
    if (contentTypeMappings && contentTypeMappings[filename]) {
      return {
        type: contentTypeMappings[filename],
        confidence: 100,
        reason: 'Manual mapping'
      };
    }

    // PRIORITY 2: Check URL path - if /blog/ is in URL, it's definitely a post
    const filenameKey = filename.replace('.html', '');
    if (urlMappings && urlMappings[filenameKey]) {
      const originalUrl = urlMappings[filenameKey].originalUrl || '';
      const originalPath = urlMappings[filenameKey].originalPath || '';
      
      // Check for /blog/ in URL path
      if (originalPath.includes('/blog/') || originalUrl.includes('/blog/')) {
        return {
          type: 'post',
          confidence: 100,
          reason: 'URL contains /blog/ path - definitive post indicator'
        };
      }

      // Check for other common blog path indicators
      if (originalPath.includes('/news/') || originalPath.includes('/article/') || originalPath.includes('/posts/')) {
        return {
          type: 'post',
          confidence: 95,
          reason: `URL contains blog path indicator: ${originalPath}`
        };
      }
    }

    // Pre-compute lowercase HTML for multiple checks
    const htmlLower = html.toLowerCase();

    // Use custom selectors if provided
    if (customSelectors) {
      try {
        const dom = new JSDOM(this._wrapHtmlForParsing(html));
        const document = dom.window.document;

        // Helper function to convert plain class names to CSS selectors
        const normalizeSelector = (selector) => {
          if (!selector) return selector;
          if (!/^[.#\[]/.test(selector) && !/[\s>+~\[]/.test(selector)) {
            return `.${selector}`;
          }
          return selector;
        };

        // Check selector matches (supports comma-separated)
        const checkSelectors = (selectorString, type) => {
          if (!selectorString) return null;
          const selectors = selectorString.split(',').map(s => s.trim()).filter(s => s);
          
          // Check DOM matches first
          for (const selectorStr of selectors) {
            const normalized = normalizeSelector(selectorStr);
            const elements = document.querySelectorAll(normalized);
            if (elements.length > 0) {
              return { 
                type, 
                confidence: 95, 
                reason: `Found ${type} selector: ${selectorStr} (${elements.length} elements)` 
              };
            }
          }
          
          // Try text matching as fallback
          for (const selectorStr of selectors) {
            const normalized = normalizeSelector(selectorStr);
            const textToMatch = normalized.startsWith('.') ? normalized.substring(1) : normalized;
            if (htmlLower.includes(textToMatch.toLowerCase())) {
              return {
                type,
                confidence: 85,
                reason: `Found ${type} selector (text match): ${selectorStr}`
              };
            }
          }
          
          return null;
        };

        // Check post selectors
        const postResult = checkSelectors(customSelectors.post, 'post');
        if (postResult) return postResult;

        // Check page selectors
        const pageResult = checkSelectors(customSelectors.page, 'page');
        if (pageResult) return pageResult;

        // Handle fallback logic
        if (customSelectors.post && !customSelectors.page) {
          console.log(`   📄 Post class '${customSelectors.post}' not found in ${filename}, defaulting to page`);
          return { type: 'page', confidence: 80, reason: `Post class not found, defaulting to page` };
        }

        if (customSelectors.page && !customSelectors.post) {
          console.log(`   📝 Page class '${customSelectors.page}' not found in ${filename}, defaulting to post`);
          return { type: 'post', confidence: 80, reason: `Page class not found, defaulting to post` };
        }

        if (customSelectors.post && customSelectors.page) {
          console.log(`   ⚠️  Both custom classes provided but not found in ${filename}, using automatic detection`);
        }
      } catch (error) {
        console.warn(`Error checking custom selectors for ${filename}:`, error.message);
      }
    }

    // HIGH PRIORITY: Check for <article> tag - definitive post indicator
    if (htmlLower.includes('<article')) {
      try {
        const dom = new JSDOM(this._wrapHtmlForParsing(html));
        const document = dom.window.document;
        const articleElements = document.querySelectorAll('article');
        if (articleElements && articleElements.length > 0) {
          return {
            type: 'post',
            confidence: 95,
            reason: `Found <article> tag (${articleElements.length} elements) - definitive post indicator`
          };
        }
      } catch (error) {
        // Fallback: already checked htmlLower above
        return {
          type: 'post',
          confidence: 90,
          reason: 'Found <article> tag (text match) - definitive post indicator'
        };
      }
    }

    // Fallback to automatic content analysis
    try {
      const dom = new JSDOM(this._wrapHtmlForParsing(html));
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
    // CSV generator handles final cleanup: tags, imgnone, etc.
    if (!html || html.trim() === '') {
      return '';
    }
    
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const body = document.body;
      
      if (!body) {
        return html.trim();
      }
      
      // Remove tag sections (e.g., "Tags<span>:</span> <a href=...")
      // IMPORTANT: Only remove small tag-only containers, not large content containers
      // Look for elements containing tag links with rel="tag" or href containing "/tag"
      const allElements = Array.from(body.querySelectorAll('*'));
      const elementsToRemove = [];
      
      allElements.forEach(element => {
        const textContent = element.textContent?.trim() || '';
        const innerHTML = element.innerHTML || '';
        const tagName = element.tagName?.toLowerCase();
        
        // Skip large containers (article, main content divs) - they contain both content AND tags
        // Only target small, tag-specific containers
        if (tagName === 'article' || 
            tagName === 'main' || 
            textContent.length > 500) {
          return; // Skip large content containers
        }
        
        // Check if element contains tag links
        const tagLinks = element.querySelectorAll('a[rel*="tag"], a[href*="/tag"], a[href*="tag"]');
        
        if (tagLinks.length > 0) {
          // Check if text starts with "Tag" or "Tags" (case insensitive)
          const startsWithTag = /^Tags?\s*[:：]?\s*/i.test(textContent) || 
                                /Tags?\s*<span[^>]*>[:：]<\/span>\s*/i.test(innerHTML);
          
          // Also check if innerHTML contains "Tags" followed by tag links
          const hasTagPattern = /Tags?\s*[:：]?\s*<a[^>]*rel=["']tag/i.test(innerHTML) ||
                                /Tags?\s*<span[^>]*>[:：]<\/span>\s*<a[^>]*rel=["']tag/i.test(innerHTML);
          
          // Only remove if it's clearly a tag-only section (small container, starts with "Tag")
          // AND doesn't contain substantial content (paragraphs, headings, etc.)
          const hasSubstantialContent = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, img').length > 0;
          
          if ((startsWithTag || hasTagPattern) && !hasSubstantialContent) {
            elementsToRemove.push(element);
          }
        }
      });
      
      // Remove tag elements
      elementsToRemove.forEach(element => {
        try {
          if (element.parentNode) {
            element.remove();
          }
        } catch (error) {
          console.warn(`   ⚠️  Could not remove tag element: ${error.message}`);
        }
      });
      
      // Remove imgnone references and malformed tags
      const images = body.querySelectorAll('img');
      images.forEach(img => {
        const attrs = [img.getAttribute('src'), img.getAttribute('class'), img.getAttribute('id')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        
        if (attrs.includes('imgnone')) {
          try {
            if (img.parentNode) img.remove();
          } catch (error) {
            console.warn(`   ⚠️  Could not remove imgnone image: ${error.message}`);
          }
        }
      });
      
      // Clean HTML string: remove malformed tags and imgnone
      return this._removeMalformedTags(body.innerHTML).trim();
      
    } catch (error) {
      console.warn(`Error cleaning content for CSV: ${error.message}`);
      // Fallback: remove malformed tags and imgnone from HTML string
      return this._removeMalformedTags(html).trim();
    }
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
   * @returns {Promise<Object>} Processed item data
   */
  async _processHtmlFile(filename) {
    const scrapedPath = path.join(config.resolvePath('output/scraped-content'), filename);
    const cleanPath = path.join(config.resolvePath('output/clean-content'), filename);
    
    try {
      // Read original scraped HTML for title and date extraction
      const originalHtml = await fs.readFile(scrapedPath, 'utf-8');
      
      // Extract title from original scraped HTML (H1 is the primary source)
      // The H1 tag from output/scraped-content/ is used as the post/page title
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
      
      // Date handling: Posts keep original date, Pages use yesterday to avoid scheduling
      let postDate;
      
      if (this.contentType === 'page') {
        // For pages: Use yesterday's date to ensure immediate publication (avoid scheduling)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        postDate = yesterday.toISOString().slice(0, 19).replace('T', ' ');
        console.log(`   📅 Page date set to yesterday: ${postDate} (ensures immediate publication)`);
      } else {
        // For posts: Try to extract article date from original HTML (before classes were removed)
        // Use blogPostSelectors if provided for posts
        const articleDate = this._extractArticleDate(originalHtml);
        
        // Use article date if found, otherwise use current date
        postDate = articleDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        // Log if we found an article date
        if (articleDate) {
          console.log(`   📅 Found article date: ${articleDate}`);
        }
      }
      
      return {
        post_title: title,
        post_content: cleanContent,
        post_type: this.contentType,
        post_status: 'publish',
        post_date: postDate,
        post_name: slug,
        post_excerpt: excerpt,
        post_category: this.contentType === 'post' ? 'Uncategorized' : '',
        post_tags: '',
        filename: filename,
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
      console.log(`📝 Content Type: ${this.contentType === 'post' ? 'Blog Posts' : 'Pages'}`);

      // Log blog post selectors if provided
      if (this.contentType === 'post' && this.blogPostSelectors) {
        console.log('🎯 Blog Post Selectors:');
        if (this.blogPostSelectors.dateSelector) {
          console.log(`   📅 Date selector: ${this.blogPostSelectors.dateSelector}`);
        }
        if (this.blogPostSelectors.contentSelector) {
          console.log(`   📄 Content selector: ${this.blogPostSelectors.contentSelector}`);
        }
      }

      // Process all HTML files
      const items = [];
      const progress = new ProgressTracker(htmlFiles.length, 'Processing HTML files');
      
      for (const filename of htmlFiles) {
        const item = await this._processHtmlFile(filename);
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