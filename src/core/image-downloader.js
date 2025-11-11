/**
 * @fileoverview Image downloading service for scraped content
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import fetch from 'node-fetch';
import config from '../config/index.js';
import { ImageDownloadError, handleError, retry, ProgressTracker } from '../utils/errors.js';
import { readFile, readJSON, writeJSON, getFiles, ensureDir } from '../utils/filesystem.js';
import { JSDOM } from 'jsdom';
import path from 'path';
import fs from 'fs-extra';

/**
 * Image Downloader Service
 * Handles extraction and downloading of images from HTML content
 */
export class ImageDownloaderService {
  constructor(options = {}) {
    this.config = { ...config.get('images'), ...options };
  }

  /**
   * Check if an image should be filtered out (avatars, testimonials, user images)
   * @private
   * @param {Object} imageData - Image data object
   * @returns {Object} Filter result with shouldFilter boolean and reason
   */
  _shouldFilterImage(imageData) {
    const { url, alt, title, element } = imageData;
    
    // URL patterns that suggest avatar/testimonial images
    const urlPatterns = [
      /avatar/i, /profile/i, /testimonial/i, /review.*user/i, /user.*photo/i,
      /customer.*photo/i, /headshot/i, /portrait/i, /staff.*photo/i, /team.*photo/i,
      /author.*image/i, /gravatar/i, /wp-content.*avatars/i, /uploads.*user/i,
      /images.*user/i, /profile.*pic/i, /reviewer.*image/i, /customer.*image/i
    ];
    
    // Alt text and title patterns
    const textPatterns = [
      /avatar/i, /profile/i, /testimonial/i, /review/i, /customer.*photo/i,
      /user.*photo/i, /headshot/i, /portrait/i, /staff.*photo/i, /team.*member/i,
      /author.*image/i, /reviewer/i, /customer.*image/i, /user.*image/i, /profile.*picture/i
    ];
    
    // Check URL patterns
    if (urlPatterns.some(pattern => pattern.test(url))) {
      return { shouldFilter: true, reason: 'URL contains avatar/testimonial pattern' };
    }
    
    // Check alt text patterns
    if (alt && textPatterns.some(pattern => pattern.test(alt))) {
      return { shouldFilter: true, reason: `Alt text indicates user image: "${alt}"` };
    }
    
    // Check title patterns
    if (title && textPatterns.some(pattern => pattern.test(title))) {
      return { shouldFilter: true, reason: `Title indicates user image: "${title}"` };
    }
    
    // Check CSS classes if element is provided
    if (element && element.className) {
      const classPatterns = [
        /avatar/i, /profile/i, /testimonial.*image/i, /user.*photo/i,
        /customer.*image/i, /reviewer.*image/i, /author.*image/i,
        /staff.*photo/i, /team.*photo/i
      ];
      
      if (classPatterns.some(pattern => pattern.test(element.className))) {
        return { shouldFilter: true, reason: `CSS class indicates user image: "${element.className}"` };
      }
    }
    
    // Check parent element context if available
    if (element && element.parentElement) {
      const parentClass = element.parentElement.className || '';
      const parentPatterns = [
        /testimonial/i, /review/i, /customer.*section/i, /author.*bio/i,
        /staff.*section/i, /team.*section/i, /profile.*section/i
      ];
      
      if (parentPatterns.some(pattern => pattern.test(parentClass))) {
        return { shouldFilter: true, reason: `Parent context indicates user image: "${parentClass}"` };
      }
    }
    
    return { shouldFilter: false, reason: null };
  }

  /**
   * Normalize image URL for deduplication (remove query parameters, size variants)
   * @private
   * @param {string} url - Image URL
   * @returns {string} Normalized URL
   */
  _normalizeImageUrl(url) {
    try {
      const urlObj = new URL(url);
      // Remove query parameters like ?width=767
      return urlObj.origin + urlObj.pathname;
    } catch (error) {
      return url;
    }
  }

  /**
   * Extract base domain from filename
   * @private
   * @param {string} filename - Source filename (e.g., www.crestinfiniti.com_page.html)
   * @returns {string|null} Base domain or null
   */
  _extractBaseDomain(filename) {
    try {
      // Extract domain from filename format: www.domain.com_path.html
      const parts = filename.split('_');
      if (parts.length > 0 && parts[0].includes('.')) {
        // First part should be the domain
        const domain = parts[0];
        return `https://${domain}`;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if element is in main content (not header, footer, nav, sidebar)
   * @private
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if in main content area
   */
  _isInMainContent(element) {
    // Check if element or any parent is a footer, header, nav, or sidebar
    let current = element;
    while (current && current.tagName) {
      const tagName = current.tagName.toLowerCase();
      const className = (current.getAttribute('class') || '').toLowerCase();
      
      // Exclude footer/header elements
      if (tagName === 'footer' || tagName === 'header' || tagName === 'nav') {
        return false;
      }
      
      // Exclude elements with footer/header/sidebar/nav classes
      if (className.match(/(footer|header|sidebar|navbox|navigation|menu|topbar|bottombar|copyright|sitewide-footer|sitewide-header)/)) {
        return false;
      }
      
      current = current.parentElement;
    }
    
    return true;
  }

  /**
   * Extract image URLs from HTML content
   * @private
   * @param {string} html - HTML content
   * @param {string} sourceFilename - Source filename for reference
   * @returns {Array<Object>} Array of image data objects
   */
  _extractImageUrls(html, sourceFilename) {
    const images = [];
    const filteredImages = [];
    const seenImages = new Set(); // Track normalized URLs to avoid duplicates
    let duplicatesSkipped = 0;
    let bgImagesFound = 0;
    let excludedFromHeaderFooter = 0;
    
    // Get base domain from filename
    const baseDomain = this._extractBaseDomain(sourceFilename);
    
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // STEP 1: Find all img elements
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach((img, index) => {
        // IMPORTANT: Skip images in header, footer, nav, sidebar
        if (!this._isInMainContent(img)) {
          excludedFromHeaderFooter++;
          return;
        }
        
        const sources = [];
        
        // Get various src attributes
        if (img.src) sources.push(img.src);
        if (img.getAttribute('data-src')) sources.push(img.getAttribute('data-src'));
        if (img.getAttribute('data-lazy-src')) sources.push(img.getAttribute('data-lazy-src'));
        
        // Get srcset and extract URLs - but only use the first (largest) variant
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const srcsetUrls = srcset.split(',')
            .map(s => s.trim().split(' ')[0])
            .filter(url => url && (url.startsWith('http') || url.startsWith('/')));
          // Only take the first srcset URL to avoid duplicates
          if (srcsetUrls.length > 0 && !sources.includes(srcsetUrls[0])) {
            sources.push(srcsetUrls[0]);
          }
        }
        
        // Process each source URL
        sources.forEach(src => {
          if (!src) return;
          
          // Convert relative URLs to absolute
          let absoluteUrl = src;
          if (src.startsWith('/')) {
            if (baseDomain) {
              absoluteUrl = `${baseDomain}${src}`;
            } else {
              // Can't convert relative URL without base domain
              return;
            }
          }
          
          if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
            // Normalize URL to check for duplicates
            const normalizedUrl = this._normalizeImageUrl(absoluteUrl);
            
            // Skip if we've already seen this image (without query params)
            if (seenImages.has(normalizedUrl)) {
              duplicatesSkipped++;
              return;
            }
            
            const imageData = {
              url: absoluteUrl,
              sourceFile: sourceFilename,
              imageIndex: index,
              alt: img.alt || '',
              title: img.title || '',
              element: img
            };
            
            // Check if this image should be filtered
            const filterResult = this._shouldFilterImage(imageData);
            if (filterResult.shouldFilter) {
              filteredImages.push({
                ...imageData,
                filterReason: filterResult.reason
              });
              console.log(`   🚫 Filtered: ${src.substring(0, 60)}... - ${filterResult.reason}`);
            } else {
              // Remove element reference before adding to final array
              const { element, ...cleanImageData } = imageData;
              images.push(cleanImageData);
              seenImages.add(normalizedUrl);
            }
          }
        });
      });
      
      // STEP 2: Extract CSS background images
      const bgElements = document.querySelectorAll('[style*="background-image"]');
      
      bgElements.forEach((element, index) => {
        // IMPORTANT: Skip background images in header, footer, nav, sidebar
        if (!this._isInMainContent(element)) {
          excludedFromHeaderFooter++;
          return;
        }
        
        const style = element.getAttribute('style') || '';
        const bgImageMatch = style.match(/background-image\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
        
        if (bgImageMatch && bgImageMatch[1]) {
          let bgUrl = bgImageMatch[1];
          
          // Make relative URLs absolute if needed
          if (bgUrl.startsWith('/')) {
            if (baseDomain) {
              bgUrl = `${baseDomain}${bgUrl}`;
            } else {
              // Can't convert relative URL without base domain
              return;
            }
          }
          
          // Normalize URL to check for duplicates
          const normalizedUrl = this._normalizeImageUrl(bgUrl);
          
          // Skip if we've already seen this image
          if (seenImages.has(normalizedUrl)) {
            duplicatesSkipped++;
            return;
          }
          
          const imageData = {
            url: bgUrl,
            sourceFile: sourceFilename,
            imageIndex: `bg-${index}`,
            alt: element.getAttribute('aria-label') || '',
            title: '',
            element: element
          };
          
          // Check if this image should be filtered
          const filterResult = this._shouldFilterImage(imageData);
          if (filterResult.shouldFilter) {
            filteredImages.push({
              ...imageData,
              filterReason: filterResult.reason
            });
            console.log(`   🚫 Filtered BG: ${bgUrl.substring(0, 60)}... - ${filterResult.reason}`);
          } else {
            // Remove element reference before adding to final array
            const { element, ...cleanImageData } = imageData;
            images.push(cleanImageData);
            seenImages.add(normalizedUrl);
            bgImagesFound++;
          }
        }
      });
      
    } catch (error) {
      console.warn(`Error parsing HTML from ${sourceFilename}:`, error.message);
    }
    
    // Log filtering summary if any images were filtered
    if (filteredImages.length > 0) {
      console.log(`   📊 Filtered ${filteredImages.length} avatar/testimonial images from ${sourceFilename}`);
    }
    
    // Log deduplication summary
    if (duplicatesSkipped > 0) {
      console.log(`   🔄 Skipped ${duplicatesSkipped} duplicate/size-variant images`);
    }
    
    // Log background images found
    if (bgImagesFound > 0) {
      console.log(`   🎨 Found ${bgImagesFound} CSS background images`);
    }
    
    // Log header/footer/sidebar exclusions
    if (excludedFromHeaderFooter > 0) {
      console.log(`   🚫 Excluded ${excludedFromHeaderFooter} images from header/footer/sidebar`);
    }
    
    return images;
  }

  /**
   * Generate safe filename for downloaded image
   * @private
   * @param {string} imageUrl - Image URL
   * @param {string} sourceFile - Source HTML filename
   * @param {string|number} imageIndex - Image index
   * @returns {string|null} Generated filename or null if invalid
   */
  _generateImageFilename(imageUrl, sourceFile, imageIndex) {
    try {
      const url = new URL(imageUrl);
      const pathname = url.pathname;
      let extension = path.extname(pathname).toLowerCase();
      
      // If no extension, use .jpg as default
      if (!extension || !this.config.allowedFormats.includes(extension)) {
        extension = '.jpg';
      }
      
      // Create base filename from source HTML file
      const sourceBase = path.basename(sourceFile, '.html');
      
      // Get image filename from URL
      let imageName = path.basename(pathname, path.extname(pathname));
      if (!imageName || imageName === '') {
        imageName = `image_${imageIndex}`;
      }
      
      // Clean filename
      imageName = imageName
        .replace(/[^a-z0-9._-]/gi, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 50);
      
      return `${sourceBase}_${imageName}${extension}`;
    } catch (error) {
      console.warn(`Invalid URL: ${imageUrl}`);
      return null;
    }
  }

  /**
   * Get correct file extension from content type
   * @private
   * @param {string} contentType - HTTP content type
   * @returns {string} File extension
   */
  _getExtensionFromContentType(contentType) {
    const contentTypeMap = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg', 
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/x-icon': '.ico',
      'image/vnd.microsoft.icon': '.ico'
    };
    
    return contentTypeMap[contentType.toLowerCase()] || '.jpg';
  }

  /**
   * Download single image with retry logic
   * @private
   * @param {Object} imageInfo - Image information
   * @param {string} filename - Target filename
   * @param {string} outputPath - Target output path
   * @returns {Promise<Object>} Download result
   */
  async _downloadImage(imageInfo, filename, outputPath) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(imageInfo.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new ImageDownloadError(`HTTP ${response.status}: ${response.statusText}`, imageInfo.url);
      }
      
      // Check if we need to correct the file extension based on content type
      const contentType = response.headers.get('content-type') || '';
      let finalFilename = filename;
      let finalOutputPath = outputPath;
      
      if (contentType.startsWith('image/')) {
        const correctExtension = this._getExtensionFromContentType(contentType);
        const currentExtension = path.extname(filename);
        
        if (currentExtension !== correctExtension) {
          const baseName = path.basename(filename, currentExtension);
          finalFilename = baseName + correctExtension;
          finalOutputPath = path.join(path.dirname(outputPath), finalFilename);
        }
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(finalOutputPath, buffer);
      
      return {
        success: true,
        filename: finalFilename,
        size: buffer.length,
        url: imageInfo.url,
        contentType: contentType
      };
      
    } catch (error) {
      clearTimeout(timeout);
      throw new ImageDownloadError(`Failed to download ${filename}: ${error.message}`, imageInfo.url, error);
    }
  }

  /**
   * Download all images from HTML files
   * @returns {Promise<Object>} Download results summary  
   */
  async downloadAllImages() {
    if (!this.config.enabled) {
      console.log('📸 Image downloading is disabled');
      return { successful: 0, failed: 0, skipped: 0, bypassedImages: true };
    }

    console.log('🖼️  Starting Image Downloader');
    console.log(`📁 Scanning: ${this.config.inputDir || config.get('scraper').outputDir}/`);
    console.log(`💾 Output: ${this.config.outputDir}/`);

    try {
      // Check if input directory exists
      const inputDir = config.resolvePath(this.config.inputDir || config.get('scraper').outputDir);
      const htmlFiles = await getFiles(inputDir, '.html');

      if (htmlFiles.length === 0) {
        throw new Error(`No HTML files found in ${inputDir}`);
      }

      console.log(`📄 Found ${htmlFiles.length} HTML files`);

      // Extract images from all HTML files
      let allImages = [];
      let totalFiltered = 0;
      
      for (const filename of htmlFiles) {
        console.log(`🔍 Scanning: ${filename}`);
        const filePath = path.join(inputDir, filename);
        const html = await readFile(filePath, '');
        
        if (!html || typeof html !== 'string') {
          console.warn(`Skipping ${filename} - not a text file or empty`);
          continue;
        }
        
        const images = this._extractImageUrls(html, filename);
        console.log(`   📸 Found ${images.length} images`);
        allImages.push(...images);
      }

      // Remove duplicates
      const uniqueImages = [];
      const seenUrls = new Set();
      
      for (const img of allImages) {
        if (!seenUrls.has(img.url)) {
          seenUrls.add(img.url);
          uniqueImages.push(img);
        }
      }

      console.log(`\n📊 Image Summary:`);
      console.log(`   Total found: ${allImages.length}`);
      console.log(`   Avatar/testimonial filtered: ${totalFiltered}`);
      console.log(`   Unique URLs: ${uniqueImages.length}`);
      console.log(`   Duplicates removed: ${allImages.length - uniqueImages.length}`);

      if (uniqueImages.length === 0) {
        console.log('\n✅ No images to download!');
        return { successful: 0, failed: 0, skipped: uniqueImages.length };
      }

      // Create output directory
      const outputDir = config.resolvePath(this.config.outputDir);
      await ensureDir(outputDir);

      console.log('\n🚀 Starting downloads...');
      const startTime = Date.now();
      const progress = new ProgressTracker(uniqueImages.length, 'Downloading images');
      
      // Download images with concurrency control
      const results = [];
      const errors = [];
      
      // Process in batches to control concurrency
      for (let i = 0; i < uniqueImages.length; i += this.config.maxConcurrent) {
        const batch = uniqueImages.slice(i, i + this.config.maxConcurrent);
        
        const batchPromises = batch.map(async (imageInfo) => {
          const filename = this._generateImageFilename(imageInfo.url, imageInfo.sourceFile, imageInfo.imageIndex);
          
          if (!filename) {
            return { success: false, error: 'Invalid URL', url: imageInfo.url };
          }
          
          const outputPath = path.join(outputDir, filename);
          
          // Skip if file already exists
          const exists = await fs.pathExists(outputPath);
          if (exists) {
            const stats = await fs.stat(outputPath);
            return {
              success: true,
              filename,
              size: stats.size,
              url: imageInfo.url,
              skipped: true
            };
          }
          
          try {
            return await retry(
              () => this._downloadImage(imageInfo, filename, outputPath),
              this.config.retryAttempts
            );
          } catch (error) {
            return handleError(error, { url: imageInfo.url });
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
          progress.update(1, result.success ? '✅' : '❌');
        });
      }
      
      progress.complete();
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Create image mapping file
      const mapping = {
        timestamp: new Date().toISOString(),
        totalImages: uniqueImages.length,
        successful: results.length,
        failed: errors.length,
        duration: `${duration}s`,
        images: results.map(result => ({
          originalUrl: result.url,
          localFilename: result.filename,
          size: result.size,
          skipped: result.skipped || false
        })),
        errors: errors.map(error => ({
          url: error.url || 'unknown',
          error: error.error || error.message
        }))
      };

      const mappingPath = path.join(outputDir, this.config.mappingFile);
      await writeJSON(mappingPath, mapping);

      console.log('\n📊 DOWNLOAD COMPLETE');
      console.log('='.repeat(60));
      console.log(`✅ Successful: ${results.length}/${uniqueImages.length}`);
      console.log(`❌ Failed: ${errors.length}/${uniqueImages.length}`);
      console.log(`⚡ Duration: ${duration}s`);

      if (results.length > 0) {
        const totalSize = results.reduce((sum, r) => sum + (r.size || 0), 0);
        console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(1)}MB`);
      }

      return {
        successful: results.length,
        failed: errors.length,
        skipped: 0,
        mapping
      };

    } catch (error) {
      throw new ImageDownloadError('Image download process failed', null, error);
    }
  }
}

