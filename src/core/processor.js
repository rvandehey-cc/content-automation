/**
 * @fileoverview Content processing service for WordPress
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import { JSDOM } from 'jsdom';
import config from '../config/index.js';
import { ProcessingError, handleError, ProgressTracker } from '../utils/errors.js';
import { readJSON, writeJSON, getFiles, ensureDir } from '../utils/filesystem.js';

/**
 * Content Processor Service
 * Sanitizes scraped HTML and updates links/images for WordPress upload
 */
export class ContentProcessorService {
  constructor(options = {}) {
    this.config = { ...config.get('processor'), ...options };
    this.bypassImages = !config.get('images').enabled;
    this.customRemoveSelectors = options.customRemoveSelectors || [];
  }

  /**
   * Clean unwanted attributes and classes from HTML elements
   * AGGRESSIVE APPROACH: Remove ALL classes and IDs, keep only styles and essential attributes
   * @private
   * @param {Element} element - DOM element to clean
   */
  /**
   * Check if a class should be preserved (Bootstrap layout classes)
   * @private
   * @param {string} className - Class name to check
   * @returns {boolean} True if class should be preserved
   */
  _shouldPreserveClass(className) {
    // Preserve Bootstrap layout classes (Bootstrap 3, 4, and 5)
    const preservePatterns = [
      /^col(-xs|-sm|-md|-lg|-xl)?(-\d+)?$/,        // col, col-md, col-12, col-md-6, col-xs-12, etc.
      /^col(-xs|-sm|-md|-lg|-xl)?-offset(-\d+)?$/, // col-sm-offset-3, etc.
      /^row$/,                       // row
      /^container(-fluid)?$/,        // container, container-fluid
      /^text-(left|center|right|justify|start|end)$/,  // text-left, text-center, etc.
      /^float-(left|right|none|start|end)$/,   // float-left, float-right, etc.
      /^d-(none|inline|inline-block|block|flex|inline-flex|grid|table|table-row|table-cell)$/,   // d-none, d-block, etc.
      /^align-(baseline|top|middle|bottom|text-top|text-bottom|start|center|end)$/,  // align-start, align-center, etc.
      /^justify-content-(start|end|center|between|around|evenly)$/,           // justify-content-center, etc.
      /^align-items-(start|end|center|baseline|stretch)$/,               // align-items-center, etc.
      /^align-self-(start|end|center|baseline|stretch)$/,                // align-self-center, etc.
      /^flex-(row|row-reverse|column|column-reverse|wrap|nowrap|wrap-reverse|fill|grow-\d+|shrink-\d+)$/,     // flex-row, flex-column, etc.
      /^m[tbrlxy]?-(\d+|auto)$/,           // m-3, mt-2, mx-auto, mb-0, etc.
      /^p[tbrlxy]?-\d+$/,           // p-3, pt-2, px-4, etc.
      /^w-(\d+|auto|100)$/,                     // w-100, w-50, w-auto, etc.
      /^h-(\d+|auto|100)$/,                     // h-100, h-50, h-auto, etc.
      /^offset-\d+$/,                           // offset-3, etc.
      /^order-\d+$/                             // order-1, order-2, etc.
    ];
    
    return preservePatterns.some(pattern => pattern.test(className));
  }

  _cleanElement(element) {
    // Remove images if bypassing image processing
    if (this.bypassImages && (element.tagName === 'IMG' || element.tagName === 'PICTURE')) {
      element.remove();
      return;
    }

    // SELECTIVE CLEANING: Remove classes EXCEPT Bootstrap layout classes
    if (element.hasAttribute('class')) {
      const classList = element.getAttribute('class').split(/\s+/).filter(c => c);
      const preservedClasses = classList.filter(className => this._shouldPreserveClass(className));
      
      // Debug: count and log preserved classes
      if (!this._bootstrapClassCount) this._bootstrapClassCount = 0;
      if (preservedClasses.length > 0) {
        this._bootstrapClassCount += preservedClasses.length;
      }
      if (preservedClasses.length > 0 && !this._bootstrapPreserveLogged) {
        console.log(`   ✨ Preserving Bootstrap layout classes (found ${classList.length} total, keeping ${preservedClasses.length})`);
        console.log(`   📝 Sample preserved: ${preservedClasses.slice(0, 5).join(', ')}`);
        this._bootstrapPreserveLogged = true;
      }
      
      if (preservedClasses.length > 0) {
        // Keep only Bootstrap layout classes
        const classValue = preservedClasses.join(' ');
        // Use setAttribute to ensure DOM updates properly
        element.setAttribute('class', classValue);
      } else {
        // No Bootstrap classes to preserve, remove the attribute
        element.removeAttribute('class');
      }
    }

    // AGGRESSIVE CLEANING: Remove ALL id attributes  
    if (element.hasAttribute('id')) {
      element.removeAttribute('id');
    }

    // Define attributes to keep based on element type
    const attributesToKeep = ['style']; // Always keep inline styles
    
    // Keep essential attributes based on element type
    if (element.tagName === 'A') {
      attributesToKeep.push('href', 'target', 'rel');
    } else if (element.tagName === 'IMG') {
      attributesToKeep.push('src', 'alt', 'width', 'height');
    } else if (element.tagName === 'IFRAME') {
      attributesToKeep.push('src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'title', 'referrerpolicy');
    } else if (element.tagName === 'VIDEO' || element.tagName === 'AUDIO') {
      attributesToKeep.push('src', 'width', 'height', 'controls', 'autoplay', 'loop', 'muted', 'poster');
    } else if (['TD', 'TH'].includes(element.tagName)) {
      attributesToKeep.push('scope', 'colspan', 'rowspan');
    } else if (element.tagName === 'TABLE') {
      attributesToKeep.push('border', 'cellpadding', 'cellspacing');
    }

    // Remove all other attributes except the ones we want to keep
    const attributesToRemove = [];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (!attributesToKeep.includes(attr.name.toLowerCase())) {
        attributesToRemove.push(attr.name);
      }
    }

    attributesToRemove.forEach(attr => element.removeAttribute(attr));
  }

  /**
   * Extract domain from URL for comparison
   * @private
   * @param {string} url - URL to extract domain from
   * @returns {string|null} Domain or null if invalid
   */
  _extractDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (error) {
      return null;
    }
  }

  /**
   * Update links to relative WordPress URLs
   * @private
   * @param {Element} element - DOM element to process
   * @param {string} baseUrl - Base URL for the site
   */
  _updateLinks(element, baseUrl) {
    const links = element.querySelectorAll('a[href]');
    
    if (links.length === 0) {
      console.log(`   🔗 No links found to process`);
      return;
    }
    
    console.log(`   🔗 Processing ${links.length} links...`);
    
    // Extract the base domain from the original site
    const baseDomain = this._extractDomain(`https://${baseUrl}`);
    console.log(`   📍 Base domain for comparison: ${baseDomain}`);
    
    let linksProcessed = {
      finance: 0,
      newVehicles: 0,
      usedVehicles: 0,
      certified: 0,
      contact: 0,
      sitemap: 0,
      service: 0,
      parts: 0,
      internal: 0,
      external: 0,
      relative: 0,
      normalized: 0,
      skipped: 0
    };
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        linksProcessed.skipped++;
        return; // Skip anchors, email, phone links
      }

      let newHref = href;
      
      // Convert to lowercase for pattern matching
      const hrefLower = href.toLowerCase();
      
      // First, check for specific content patterns and convert to WordPress URLs
      // IMPORTANT: Check more specific patterns first before general ones
      if (hrefLower.includes('finance') || hrefLower.includes('apply')) {
        newHref = '/finance/apply-for-financing/';
        linksProcessed.finance = (linksProcessed.finance || 0) + 1;
        console.log(`   💰 Finance/Apply link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('directions') || hrefLower.includes('contact')) {
        newHref = '/contact-us/';
        linksProcessed.contact++;
        console.log(`   📞 Contact/Directions link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('/new-') || hrefLower.includes('new-inventory') || hrefLower.includes('search/new') || hrefLower.includes('new')) {
        newHref = '/new-vehicles/';
        linksProcessed.newVehicles++;
        console.log(`   🚗 New vehicles link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('certified') || hrefLower.includes('cpo')) {
        newHref = '/used-vehicles/certified-pre-owned-vehicles/';
        linksProcessed.certified++;
        console.log(`   🏆 Certified vehicles link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('/used-') || hrefLower.includes('used-inventory') || hrefLower.includes('search/used') || hrefLower.includes('used')) {
        newHref = '/used-vehicles/';
        linksProcessed.usedVehicles++;
        console.log(`   🔧 Used vehicles link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('sitemap')) {
        newHref = '/sitemap/';
        linksProcessed.sitemap++;
        console.log(`   🗺️ Sitemap link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('service')) {
        newHref = '/service/';
        linksProcessed.service++;
        console.log(`   🔧 Service link: ${href} → ${newHref}`);
      } else if (hrefLower.includes('parts')) {
        newHref = '/parts/';
        linksProcessed.parts++;
        console.log(`   🔩 Parts link: ${href} → ${newHref}`);
      } else if (href.startsWith('http')) {
        // Handle absolute URLs
        const linkDomain = this._extractDomain(href);
        
        if (linkDomain && linkDomain === baseDomain) {
          // Internal link - convert to relative by removing domain
          try {
            const url = new URL(href);
            newHref = url.pathname + url.search + url.hash;
            linksProcessed.internal++;
            console.log(`   🔗 Internal link made relative: ${href} → ${newHref}`);
          } catch (error) {
            console.log(`   ⚠️  Could not parse URL: ${href}`);
            linksProcessed.skipped++;
            return;
          }
        } else {
          // External link - keep as is but ensure it opens in new tab
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          linksProcessed.external++;
          console.log(`   🌐 External link preserved: ${href}`);
          return;
        }
      } else if (href.startsWith('/')) {
        // Already relative - keep as is
        linksProcessed.relative++;
        console.log(`   ✅ Relative link preserved: ${href}`);
      } else {
        // Relative path without leading slash - normalize it
        if (!href.startsWith('./') && !href.includes('..')) {
          newHref = '/' + href;
          linksProcessed.normalized++;
          console.log(`   🔧 Normalized relative link: ${href} → ${newHref}`);
        } else {
          linksProcessed.skipped++;
        }
      }
      
      link.setAttribute('href', newHref);
    });
    
    // Show summary of link processing
    console.log(`   📊 Link processing summary:`);
    console.log(`      💰 Finance: ${linksProcessed.finance}`);
    console.log(`      📞 Contact/Directions: ${linksProcessed.contact}`);
    console.log(`      🚗 New vehicles: ${linksProcessed.newVehicles}`);
    console.log(`      🔧 Used vehicles: ${linksProcessed.usedVehicles}`);
    console.log(`      🏆 Certified: ${linksProcessed.certified}`);
    console.log(`      🗺️ Sitemap: ${linksProcessed.sitemap}`);
    console.log(`      🔧 Service: ${linksProcessed.service}`);
    console.log(`      🔩 Parts: ${linksProcessed.parts}`);
    console.log(`      🔗 Internal → relative: ${linksProcessed.internal}`);
    console.log(`      🌐 External (preserved): ${linksProcessed.external}`);
    console.log(`      ✅ Already relative: ${linksProcessed.relative}`);
    console.log(`      🔧 Normalized: ${linksProcessed.normalized}`);
    console.log(`      ⏭️  Skipped: ${linksProcessed.skipped}`);
  }

  /**
   * Update image sources to use dealer upload path (skip if images bypassed)
   * @private
   * @param {Element} element - DOM element to process
   * @param {Object} imageMapping - Image mapping data
   * @param {Object} dealerConfig - Dealer configuration
   */
  _updateImageSources(element, imageMapping, dealerConfig) {
    // Skip image processing if bypassed
    if (this.bypassImages) {
      return;
    }
    
    // Get WordPress upload settings from config
    const processorConfig = this.config;
    const dealerSlug = processorConfig.dealerSlug;
    const imageYear = processorConfig.imageYear;
    const imageMonth = processorConfig.imageMonth;
    
    // Skip if no dealer slug configured
    if (!dealerSlug) {
      console.log('   ⚠️  No dealer slug configured - skipping image URL updates');
      return;
    }
    
    const images = element.querySelectorAll('img[src]');
    let updatedCount = 0;
    
    images.forEach(img => {
      const src = img.getAttribute('src');
      
      // Find matching image in mapping
      let imageMatch = null;
      if (imageMapping && imageMapping.images) {
        imageMatch = imageMapping.images.find(item => {
          // Exact match
          if (item.originalUrl === src) return true;
          
          // Check if mapping URL ends with the src (handles relative URLs)
          if (item.originalUrl.endsWith(src)) return true;
          
          // For relative URLs like /static/..., check if mapping URL contains the path
          if (src.startsWith('/')) {
            // Extract path from absolute mapping URL and compare
            try {
              const mappingUrl = new URL(item.originalUrl);
              if (mappingUrl.pathname === src) return true;
            } catch (e) {
              // If mapping URL is also relative, do direct comparison
              if (item.originalUrl === src) return true;
            }
          }
          
          return false;
        });
      }
      
      if (imageMatch) {
        // Update to WordPress upload URL structure
        // Format: https://di-uploads-development.dealerinspire.com/{dealer-slug}/uploads/{year}/{month}/{filename}
        const wpUrl = `https://di-uploads-development.dealerinspire.com/${dealerSlug}/uploads/${imageYear}/${imageMonth}/${imageMatch.localFilename}`;
        img.setAttribute('src', wpUrl);
        updatedCount++;
      } else {
        // If no mapping found, try to extract filename from src and update anyway
        let filename = null;
        
        if (src.startsWith('http://') || src.startsWith('https://')) {
          // Absolute URL
          try {
            const url = new URL(src);
            filename = url.pathname.split('/').pop();
          } catch (error) {
            // Invalid URL
          }
        } else if (src.startsWith('/')) {
          // Relative URL like /static/brand-infiniti/.../image.jpg
          filename = src.split('/').pop();
        }
        
        if (filename && filename.length > 0) {
          const wpUrl = `https://di-uploads-development.dealerinspire.com/${dealerSlug}/uploads/${imageYear}/${imageMonth}/${filename}`;
          img.setAttribute('src', wpUrl);
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      console.log(`   🖼️  Updated ${updatedCount} image URLs to WordPress structure`);
    }
  }

  /**
   * Remove forms and form elements
   * @private
   * @param {Document} body - Document body
   */
  _removeForms(body) {
    // Convert to Array to avoid live NodeList issues
    const forms = Array.from(body.querySelectorAll('form, input, textarea, select, button[type="submit"]'));
    forms.forEach(form => {
      try {
        if (form.parentNode) {
          form.remove();
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove form element: ${error.message}`);
      }
    });
  }

  /**
   * Remove footer elements and their content
   * @private
   * @param {Document} body - Document body
   */
  _removeFooters(body) {
    // Convert to Array to avoid live NodeList issues
    const footers = Array.from(body.querySelectorAll('footer'));
    let footerCount = 0;
    footers.forEach(footer => {
      try {
        if (footer.parentNode) {
          footer.remove();
          footerCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove footer element: ${error.message}`);
      }
    });
    if (footerCount > 0) {
      console.log(`   🚫 Removed ${footerCount} footer elements`);
    }
  }

  /**
   * Remove blog-specific elements from posts (sidebar, navigation, dates, etc.)
   * WordPress will generate these automatically, so they shouldn't be in imported content
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for context
   */
  _removeBlogElements(body, filename) {
    let elementsRemoved = 0;
    
    // Remove elements by text content patterns (breadcrumbs, dates, author info, etc.)
    const textPatternsToRemove = [
      // Navigation breadcrumbs
      /^«.*»$/,  // « Previous Post » Next Post
      /^«\s*[\w\s:,-]+$/,  // « Previous Post Title
      /^[\w\s:,-]+\s*»$/,  // Next Post Title »
      
      // Date patterns
      /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i,
      /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}$/,
      
      // Blog meta info
      /^Posted in.*\|.*$/i,
      /^By\s+[\w\s]+$/i,
      /^Author:.*$/i,
      /^No Comments.*$/i,
      /^\d+\s+Comments?.*$/i,
      
      // Social/sharing
      /^Share this.*$/i,
      /^Follow us.*$/i,
      /^Connect with us.*$/i,
    ];
    
    // Remove elements with specific headings/titles
    const headingPatternsToRemove = [
      /^Recent Blog Entries$/i,
      /^Recent Posts$/i,
      /^Categories$/i,
      /^Tags$/i,
      /^Archives$/i,
      /^Connect with us$/i,
      /^Follow us$/i,
      /^Related Posts$/i,
      /^You May Also Like$/i,
      /^More Articles$/i,
    ];
    
    // Function to check if text matches any pattern
    const matchesPattern = (text, patterns) => {
      const cleanText = text.trim();
      return patterns.some(pattern => pattern.test(cleanText));
    };
    
    // Get all elements to check for blog-specific content
    const allElements = Array.from(body.querySelectorAll('*'));
    const elementsToRemove = [];
    
    allElements.forEach(element => {
      const textContent = element.textContent?.trim() || '';
      
      // Skip if element is too large (likely main content)
      if (textContent.length > 500) return;
      
      // IMPORTANT: Skip main content containers even if they're small
      const className = element.getAttribute('class') || '';
      const isContentContainer = /(container|row|col-|main|content|article|entry|post-content|blogContent|descriptionDiv)/i.test(className);
      
      if (isContentContainer) {
        return; // Don't remove content containers
      }
      
      // Check for text patterns to remove
      if (matchesPattern(textContent, textPatternsToRemove)) {
        elementsToRemove.push(element);
        return;
      }
      
      // Check for heading patterns (h1-h6 elements)
      if (/^h[1-6]$/i.test(element.tagName) && matchesPattern(textContent, headingPatternsToRemove)) {
        // Remove the heading and its following sibling content
        elementsToRemove.push(element);
        
        // Also remove the next sibling if it's a container with blog content
        let nextSibling = element.nextElementSibling;
        if (nextSibling && ['div', 'ul', 'section'].includes(nextSibling.tagName.toLowerCase())) {
          const siblingText = nextSibling.textContent?.trim() || '';
          // If the sibling contains typical blog sidebar content, remove it too
          if (siblingText.length < 1000 && 
              (siblingText.includes('href=') || 
               siblingText.includes('Essential Ford') || 
               siblingText.includes('Stuart'))) {
            elementsToRemove.push(nextSibling);
          }
        }
        return;
      }
      
      // Remove elements that are clearly blog navigation/metadata
      if (element.tagName.toLowerCase() === 'div') {
        // Check for navigation arrows and similar patterns
        if (/^[«»←→]+/.test(textContent) || /[«»←→]+$/.test(textContent)) {
          elementsToRemove.push(element);
          return;
        }
        
        // Remove date containers
        if (textContent.length < 50 && matchesPattern(textContent, textPatternsToRemove.slice(3, 6))) {
          elementsToRemove.push(element);
          return;
        }
      }
      
      // Remove comment sections
      if (element.id && /comment/i.test(element.id)) {
        elementsToRemove.push(element);
      }
      
      // Remove elements with blog-specific classes (if any survived cleaning)
      // BUT preserve main content containers (already checked above, but double-check for class-based patterns)
      const elementClass = element.className || '';
      const isClassBasedContainer = /(main|content|article|entry|post-content|blogContent|descriptionDiv)/i.test(elementClass);
      
      if (typeof elementClass === 'string' && 
          /(sidebar|widget|recent|categories|archive|meta|nav|breadcrumb|comment)/i.test(elementClass) &&
          !isClassBasedContainer) {
        elementsToRemove.push(element);
      }
    });
    
    // Remove all identified elements
    elementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          elementsRemoved++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove blog element: ${error.message}`);
      }
    });
    
    if (elementsRemoved > 0) {
      console.log(`   🧹 Removed ${elementsRemoved} blog-specific elements (navigation, dates, sidebar content)`);
    }
  }

  /**
   * Remove copyright text mentioning third-party companies
   * @private
   * @param {Document} body - Document body
   */
  _removeCopyright(body) {
    let copyrightCount = 0;
    
    // Common third-party website companies to remove
    const thirdPartyCompanies = [
      'dealeron', 'dealer.com', 'dealerdotcom', 'cobalt', 'vinsolutions', 
      'autotrader', 'cars.com', 'edmunds', 'carmax', 'cargurus', 
      'dealership.com', 'dealer-fx', 'dealerfx', 'autofusion', 'reynolds'
    ];

    // Find elements containing copyright text with third-party companies
    const allElements = Array.from(body.querySelectorAll('*'));
    const elementsToCheck = [...allElements, body]; // Include body itself
    
    elementsToCheck.forEach(element => {
      // Check each text node within the element
      const childNodes = Array.from(element.childNodes);
      
      childNodes.forEach(node => {
        if (node.nodeType === 3) { // Text node
          const text = node.textContent;
          const textLower = text.toLowerCase();
          
          // Check for copyright patterns mentioning third-party companies
          if ((textLower.includes('copyright') || textLower.includes('©')) && text.trim()) {
            // Check if any third-party company is mentioned
            const hasThirdParty = thirdPartyCompanies.some(company => 
              textLower.includes(company)
            );
            
            if (hasThirdParty) {
              try {
                const parent = node.parentNode;
                node.remove();
                copyrightCount++;
                
                // If removing text leaves parent with only whitespace, remove parent too
                if (parent && parent !== body && 
                    parent.textContent.trim() === '' && 
                    parent.children.length === 0) {
                  parent.remove();
                }
              } catch (error) {
                console.warn(`   ⚠️ Could not remove copyright text: ${error.message}`);
              }
            }
          }
        }
      });
    });

    if (copyrightCount > 0) {
      console.log(`   📝 Removed ${copyrightCount} third-party copyright references`);
    }
  }

  /**
   * Detect content type (post vs page) for conditional processing
   * @private
   * @param {string} html - HTML content
   * @param {string} filename - Filename for context
   * @returns {Object} Detection result with type, confidence, and reason
   */
  _detectContentType(html, filename) {
    const htmlLower = html.toLowerCase();
    let pageScore = 0;
    let postScore = 0;
    const reasons = [];
    
    // HIGHEST PRIORITY: Check for custom post selector - this should be decisive
    if (this.config.customSelectors && this.config.customSelectors.post) {
      const postClassOrSelector = this.config.customSelectors.post;
      
      // Helper function to convert plain class names to CSS selectors
      const normalizeSelector = (selector) => {
        if (!selector) return selector;
        
        // If it doesn't start with . # [ or contain spaces/special chars, treat as class name
        if (!/^[.#\[]/.test(selector) && !/[\s>+~\[]/.test(selector)) {
          return `.${selector}`;
        }
        return selector;
      };
      
      // Parse HTML to check for the actual CSS selector
      try {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const postSelector = normalizeSelector(postClassOrSelector);
        
        // Check if selector exists in the document
        const elements = document.querySelectorAll(postSelector);
        if (elements && elements.length > 0) {
          // Post selector found - this is definitively a post
          return {
            type: 'post',
            confidence: 95,
            reason: `Custom post class found: ${postClassOrSelector} (${elements.length} elements)`
          };
        } else {
          // Post selector not found - this is definitively a page
          return {
            type: 'page',
            confidence: 90,
            reason: `Post class '${postClassOrSelector}' not found, classified as page`
          };
        }
      } catch (error) {
        // Fallback to simple text matching if DOM parsing fails
        if (htmlLower.includes(postClassOrSelector.toLowerCase())) {
          return {
            type: 'post',
            confidence: 85,
            reason: `Custom post class found (text match): ${postClassOrSelector}`
          };
        } else {
          // If text matching also fails, it's a page
          return {
            type: 'page',
            confidence: 85,
            reason: `Post class '${postClassOrSelector}' not found (text match failed), classified as page`
          };
        }
      }
    }
    
    // If custom page selector is provided and found, that's decisive too
    if (this.config.customSelectors && this.config.customSelectors.page) {
      const pageClassOrSelector = this.config.customSelectors.page;
      
      // Helper function to convert plain class names to CSS selectors
      const normalizeSelector = (selector) => {
        if (!selector) return selector;
        
        // If it doesn't start with . # [ or contain spaces/special chars, treat as class name
        if (!/^[.#\[]/.test(selector) && !/[\s>+~\[]/.test(selector)) {
          return `.${selector}`;
        }
        return selector;
      };
      
      try {
        const { JSDOM } = require('jsdom');
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        const pageSelector = normalizeSelector(pageClassOrSelector);
        
        const elements = document.querySelectorAll(pageSelector);
        if (elements && elements.length > 0) {
          return {
            type: 'page',
            confidence: 95,
            reason: `Custom page class found: ${pageClassOrSelector} (${elements.length} elements)`
          };
        }
      } catch (error) {
        if (htmlLower.includes(pageClassOrSelector.toLowerCase())) {
          return {
            type: 'page',
            confidence: 85,
            reason: `Custom page class found (text match): ${pageClassOrSelector}`
          };
        }
      }
    }
    
    // HIGH PRIORITY: Check for testimonials/reviews (strong post indicators)
    const testimonialIndicators = [
      'testimonial', 'customer review', 'google review', 'yelp review',
      'end testimonial', '<!--end testimonial', 'customer says',
      'satisfied customer', 'happy customer', 'great experience',
      'highly recommend', 'five star', '5 star'
    ];
    
    let foundTestimonials = false;
    testimonialIndicators.forEach(indicator => {
      if (htmlLower.includes(indicator)) {
        foundTestimonials = true;
      }
    });
    
    if (foundTestimonials) {
      postScore += 40;
      reasons.push('Contains testimonials/reviews - likely blog post');
    }
    
    // Check for dealership information blocks (also suggests post)
    if (htmlLower.includes('dealership information') || 
        htmlLower.includes('test drive') ||
        htmlLower.includes('our location') ||
        htmlLower.includes('visit us')) {
      postScore += 30;
      reasons.push('Contains dealership marketing blocks - likely blog post');
    }
    
    // Page indicators
    if (htmlLower.includes('about us') || htmlLower.includes('about-us')) {
      pageScore += 20;
      reasons.push('Contains "about us" content');
    }
    if (htmlLower.includes('contact') || htmlLower.includes('contact us')) {
      pageScore += 20;
      reasons.push('Contains contact information');
    }
    if (htmlLower.includes('privacy policy') || htmlLower.includes('terms')) {
      pageScore += 25;
      reasons.push('Contains policy/legal content');
    }
    if (htmlLower.includes('services') && !htmlLower.includes('service department')) {
      pageScore += 15;
      reasons.push('Contains services information');
    }
    
    // Post indicators
    if (htmlLower.includes('vs ') || htmlLower.includes(' vs.')) {
      postScore += 20;
      reasons.push('Contains comparison content (vs)');
    }
    if (htmlLower.includes('review') || htmlLower.includes('comparison')) {
      postScore += 15;
      reasons.push('Contains review/comparison content');
    }
    if (htmlLower.includes('model') && (htmlLower.includes('2024') || htmlLower.includes('2025'))) {
      postScore += 15;
      reasons.push('Contains model year content');
    }
    if (htmlLower.includes('article') || htmlLower.includes('<article')) {
      postScore += 10;
      reasons.push('Contains article structure');
    }
    
    // Content marketing/tip articles are posts 
    if (htmlLower.includes('tips') || htmlLower.includes('maintenance')) {
      postScore += 25;
      reasons.push('Contains tips/maintenance content - likely blog post');
    }
    if (htmlLower.includes('how to') || htmlLower.includes('guide')) {
      postScore += 20;
      reasons.push('Contains how-to/guide content - likely blog post');
    }
    
    // URL pattern analysis
    const filenameLower = filename.toLowerCase();
    if (filenameLower.includes('about') || filenameLower.includes('contact') || filenameLower.includes('services')) {
      pageScore += 15;
      reasons.push('Filename suggests page content');
    }
    if (filenameLower.includes('vs') || filenameLower.includes('review') || filenameLower.includes('comparison')) {
      postScore += 15;
      reasons.push('Filename suggests post content');
    }
    
    // Default scoring
    if (pageScore === 0 && postScore === 0) {
      postScore = 10; // Default to post
      reasons.push('No clear indicators - defaulting to post');
    }
    
    const type = pageScore > postScore ? 'page' : 'post';
    const confidence = Math.max(pageScore, postScore);
    const reason = reasons.join(', ');
    
    return { type, confidence, reason };
  }

  /**
   * Remove dealership information and test drive calls-to-action for posts
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _removeDealershipBlocks(body, filename) {
    let removedCount = 0;
    
    // Remove iframes EXCEPT for video content (YouTube, Vimeo, etc.)
    // Convert to Array to avoid live NodeList issues
    const iframes = Array.from(body.querySelectorAll('iframe'));
    iframes.forEach(iframe => {
      try {
        if (iframe.parentNode) {
          const src = iframe.getAttribute('src') || '';
          const srcLower = src.toLowerCase();
          
          // Preserve video embeds and other legitimate content iframes
          const isVideoEmbed = 
            srcLower.includes('youtube.com') ||
            srcLower.includes('youtu.be') ||
            srcLower.includes('vimeo.com') ||
            srcLower.includes('wistia.com') ||
            srcLower.includes('vidyard.com') ||
            srcLower.includes('player.') ||
            srcLower.includes('/embed/');
          
          // Remove only non-video iframes (maps, forms, etc.)
          if (!isVideoEmbed) {
            iframe.remove();
            removedCount++;
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove iframe: ${error.message}`);
      }
    });
    
    // Remove H2 headings with dealer information and their following content
    // Convert to Array to avoid live NodeList issues
    const h2Elements = Array.from(body.querySelectorAll('h2'));
    h2Elements.forEach(h2 => {
      try {
        // Skip if element is no longer in DOM
        if (!h2.parentNode) return;
      const text = h2.textContent || '';
      const textLower = text.toLowerCase().trim();
      
      if (textLower.includes('dealership') && textLower.includes('information') ||
          textLower.includes('contact') && (textLower.includes('us') || textLower.includes('info')) ||
          textLower.includes('visit') && textLower.includes('us') ||
          textLower.includes('our') && textLower.includes('location') ||
          textLower.includes('find') && textLower.includes('us') ||
          textLower.includes('current') && textLower.includes('inventory') ||
          textLower.includes('browse') && textLower.includes('inventory') ||
          textLower.includes('available') && textLower.includes('vehicles') ||
          textLower.includes('new') && textLower.includes('vehicles') ||
          textLower.includes('used') && textLower.includes('vehicles') ||
          textLower === 'inventory' ||
          textLower.includes('search') && textLower.includes('inventory')) {
        
        // Remove the heading and all following content until next heading or end
        let nextElement = h2.nextElementSibling;
        h2.remove();
        removedCount++;
        
        while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
          const elementToRemove = nextElement;
          nextElement = nextElement.nextElementSibling;
          try {
            if (elementToRemove.parentNode) {
              elementToRemove.remove();
              removedCount++;
            }
          } catch (removeError) {
            console.warn(`   ⚠️ Could not remove element in H2 section: ${removeError.message}`);
          }
        }
      }
      } catch (error) {
        console.warn(`   ⚠️ Error processing H2 element for dealership removal: ${error.message}`);
      }
    });
    
    // Remove ONLY very specific standalone promotional paragraphs
    // Be conservative - preserve article conclusions and CTAs that are part of the content flow
    const paragraphs = body.querySelectorAll('p');
    paragraphs.forEach(element => {
      const text = element.textContent || '';
      const textLower = text.toLowerCase().trim();
      
      // Only remove very short, clearly standalone promotional snippets
      // Address and location information - only if it's ONLY address content (very short)
      if (((/\d+\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|boulevard)/i.test(text) &&
           textLower.includes('fl')) ||
          (textLower.includes('visit') && textLower.includes('showroom'))) &&
          text.length < 100 &&  // Very short - clearly just an address
          !textLower.includes('available') &&  // Not part of feature description
          !textLower.includes('include')) {  // Not part of feature description
        element.remove();
        removedCount++;
        return;
      }
      
      // Hours of operation - only dedicated hours paragraphs (very short)
      if ((textLower.includes('hours') && textLower.includes('open') ||
          (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(text) && 
          /\d{1,2}:\d{2}/i.test(text))) &&
          text.length < 150 &&
          !textLower.includes('available')) {  // Not part of feature description
        element.remove();
        removedCount++;
        return;
      }
      
      // Very specific standalone promotional snippets only (extremely short)
      // "Come down to our dealership" type content - but NOT article conclusions with links
      if ((textLower.includes('come down to') ||
          (textLower.includes('stop by') && textLower.includes('dealership'))) &&
          text.length < 80 &&  // Very short snippet
          !element.querySelector('a')) {  // No links - not part of article flow
        element.remove();
        removedCount++;
        return;
      }
    });
    
    // Remove standalone promotional links (but preserve links that are part of article content)
    // IMPORTANT: Links in article content should be preserved, not removed
    const links = body.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      const textLower = text.toLowerCase().trim();
      
      // Get the parent paragraph or container to check if link is part of article content
      const parent = link.closest('p, div, section');
      const parentText = parent ? parent.textContent.trim() : '';
      const isInArticleContent = parentText.length > 100; // Paragraph with substantial content
      
      // Check if this is a promotional/CTA link vs. part of article content
      // Only remove if it's a clear standalone CTA AND not part of article content
      const isStandaloneCTA = 
        // Very specific standalone promotional link text (exact matches only)
        (textLower === 'contact us today') ||
        (textLower === 'get directions') ||
        (textLower === 'click here for directions') ||
        (textLower === 'browse inventory') ||
        (textLower === 'view inventory') ||
        (textLower === 'search inventory') ||
        (textLower === 'shop now') ||
        (textLower === 'view all vehicles') ||
        // Only remove directions links that aren't part of article content
        (textLower.includes('directions') && !isInArticleContent);
      
      // DO NOT remove links that are part of article paragraphs
      // Links like "Contact us today to learn more..." should be preserved
      if (isStandaloneCTA && !isInArticleContent) {
        link.remove();
        removedCount++;
      }
      // All other links are preserved and will be processed by _updateLinks()
    });
    
    // Remove inventory feed elements and dynamic content loaders
    const inventorySelectors = [
      '.dataone_load',           // Dynamic data loader
      '[class*="inventory"]',    // Any class containing "inventory"
      '[id*="inventory"]',       // Any ID containing "inventory" 
      '[class*="vehicle-list"]', // Vehicle listing components
      '[class*="search-results"]' // Search result components
    ];
    
    inventorySelectors.forEach(selector => {
      const elements = body.querySelectorAll(selector);
      elements.forEach(element => {
        element.remove();
        removedCount++;
      });
    });
    
    // Remove elements with inventory feed patterns like "Used|2022|At Dealership #region_15"
    // Convert to Array to avoid live NodeList issues during removal
    const allElements = Array.from(body.querySelectorAll('div, span, p, section'));
    const elementsToRemove = [];
    
    // First pass: identify elements to remove
    allElements.forEach(element => {
      try {
        // Skip if element is no longer in DOM (parent was already removed)
        if (!element.parentNode) return;
        
        const text = element.textContent || '';
        const textLower = text.toLowerCase();
        
        // Look for inventory feed patterns
        if ((/used\|.*\|.*dealership/i.test(text) ||
             /new\|.*\|.*dealership/i.test(text) ||
             /#region_\d+/.test(text) ||
             textLower.includes('at dealership') && textLower.includes('|')) &&
            text.length < 500) { // Don't remove large content sections
          elementsToRemove.push(element);
        }
        
        // Remove inventory-specific content that's not in regular paragraphs
        // Only remove if the element is relatively small (not a large container)
        // IMPORTANT: Exclude tables and their children - tables are legitimate comparison content
        else if (element.tagName !== 'P' && 
                 element.tagName !== 'TABLE' && 
                 element.tagName !== 'TD' && 
                 element.tagName !== 'TH' &&
                 element.tagName !== 'TR' &&
                 !element.closest('table') &&  // Don't remove elements inside tables
                 !element.querySelector('table') &&  // Don't remove divs containing tables
                 text.length < 200 && (
            textLower.includes('browse our inventory') ||
            textLower.includes('search our inventory') ||
            textLower.includes('view inventory') ||
            textLower.includes('current specials') ||
            (textLower.includes('starting at') && textLower.includes('$')) ||
            textLower.includes('price excludes'))) {
          elementsToRemove.push(element);
        }
      } catch (error) {
        // Skip problematic elements
        console.warn(`   ⚠️ Skipped element during inventory removal: ${error.message}`);
      }
    });
    
    // Second pass: safely remove identified elements
    elementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          removedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove element: ${error.message}`);
      }
    });
    
    if (removedCount > 0) {
      console.log(`   🚫 Removed ${removedCount} dealership/CTA/inventory blocks from post content`);
    }
  }

  /**
   * Remove testimonials and review blocks for posts
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _removeTestimonialBlocks(body, filename) {
    let removedCount = 0;
    
    // Remove H2/H3 headings with testimonials/reviews and their following content
    // Convert to Array to avoid live NodeList issues
    const headingElements = Array.from(body.querySelectorAll('h2, h3'));
    
    headingElements.forEach(heading => {
      try {
        // Skip if element is no longer in DOM
        if (!heading.parentNode) return;
        
        const text = heading.textContent || '';
        const textLower = text.toLowerCase().trim();
        
        if (textLower.includes('testimonial') ||
            textLower.includes('review') ||
            textLower.includes('what our customers say') ||
            textLower.includes('customer feedback') ||
            textLower.includes('customer experience') ||
            textLower.includes('what people are saying') ||
            textLower.includes('customer testimonial') ||
            textLower.includes('customer review')) {
          
          // Collect all elements to remove in this section
          const sectionElementsToRemove = [heading];
          let nextElement = heading.nextElementSibling;
          
          while (nextElement && !['H1', 'H2', 'H3'].includes(nextElement.tagName)) {
            sectionElementsToRemove.push(nextElement);
            nextElement = nextElement.nextElementSibling;
          }
          
          // Remove all collected elements
          sectionElementsToRemove.forEach(element => {
            try {
              if (element.parentNode) {
                element.remove();
                removedCount++;
              }
            } catch (error) {
              console.warn(`   ⚠️ Could not remove testimonial element: ${error.message}`);
            }
          });
        }
      } catch (error) {
        console.warn(`   ⚠️ Error processing heading for testimonials: ${error.message}`);
      }
    });
    
    // Look for testimonial/review sections by class/id
    const selectors = [
      '[class*="testimonial"]',
      '[class*="review"]',
      '[class*="customer-review"]',
      '[class*="feedback"]',
      '[id*="testimonial"]',
      '[id*="review"]',
      '[id*="feedback"]'
    ];
    
    selectors.forEach(selector => {
      try {
        // Convert to Array to avoid live NodeList issues
        const elements = Array.from(body.querySelectorAll(selector));
        elements.forEach(element => {
          try {
            if (element.parentNode) {
              element.remove();
              removedCount++;
            }
          } catch (error) {
            console.warn(`   ⚠️ Could not remove testimonial by selector ${selector}: ${error.message}`);
          }
        });
      } catch (error) {
        console.warn(`   ⚠️ Error with selector ${selector}: ${error.message}`);
      }
    });
    
    // Look for content that looks like testimonials or reviews - be more selective
    // Convert to Array to avoid live NodeList issues
    const testimonialElements = Array.from(body.querySelectorAll('p, blockquote'));
    const testimonialElementsToRemove = [];
    
    // First pass: identify testimonial elements
    testimonialElements.forEach(element => {
      try {
        // Skip if element is no longer in DOM
        if (!element.parentNode) return;
        
        const text = element.textContent || '';
        const textLower = text.toLowerCase().trim();
        
        // Only remove elements that are clearly testimonials, not just mentions
        // Testimonial indicators - only remove if it's clearly a testimonial format
        if (((textLower.includes('customer') && textLower.includes('says')) ||
            (textLower.includes('testimonial')) ||
            (textLower.includes('"') && textLower.includes('satisfied') && textLower.includes('customer')) ||
            (textLower.includes('happy customer') || textLower.includes('satisfied buyer')) ||
            (textLower.includes('customer review') || textLower.includes('customer feedback')) ||
            // Star rating patterns
            (/\d+(\.\d+)?\s*(star|rating)/i.test(text) && textLower.includes('out of')) ||
            // Quote patterns that sound like testimonials - must be quoted and personal
            (/^["'].*["']$/.test(text.trim()) && 
             (textLower.includes('great') || textLower.includes('excellent') || textLower.includes('wonderful')) &&
             text.length > 50 && text.length < 1000)) && // Not too long to avoid removing legitimate content
            // Additional safety: don't remove if it contains comparison content
            !textLower.includes('vs ') && 
            !textLower.includes('compared to') &&
            !textLower.includes('performance') &&
            !textLower.includes('safety') &&
            !textLower.includes('interior') &&
            !textLower.includes('mpg') &&
            !textLower.includes('horsepower')) {
          testimonialElementsToRemove.push(element);
        }
      } catch (error) {
        console.warn(`   ⚠️ Error analyzing testimonial element: ${error.message}`);
      }
    });
    
    // Second pass: safely remove identified testimonial elements
    testimonialElementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          removedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove testimonial element: ${error.message}`);
      }
    });
    
    // Remove blockquotes only if they're clearly testimonials
    const blockquotes = body.querySelectorAll('blockquote');
    blockquotes.forEach(blockquote => {
      const text = blockquote.textContent || '';
      const textLower = text.toLowerCase().trim();
      
      // Only remove blockquotes that are clearly customer testimonials
      if (((textLower.includes('customer') && (textLower.includes('says') || textLower.includes('experience'))) || 
          (textLower.includes('service') && (textLower.includes('great') || textLower.includes('excellent')) && 
           textLower.includes('dealership'))) &&
          // Safety: don't remove if it contains comparison content
          !textLower.includes('vs ') && 
          !textLower.includes('compared to') &&
          !textLower.includes('performance') &&
          !textLower.includes('safety') &&
          text.length < 800) { // Don't remove long content blocks
        blockquote.remove();
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.log(`   🚫 Removed ${removedCount} testimonial/review blocks from post content`);
    }
  }

  /**
   * Convert Microsoft Word-style lists to proper HTML lists
   * Detects paragraphs with bullet points or mso-list styles and converts them to <ul>/<li>
   * @private
   * @param {Element} body - Document body
   */
  _convertWordListsToHtml(body) {
    console.log('   📝 Converting Microsoft Word-style lists to proper HTML...');
    
    let listsConverted = 0;
    
    // Find all paragraphs that look like list items (have bullets or mso-list styling)
    const allParagraphs = Array.from(body.querySelectorAll('p'));
    
    allParagraphs.forEach(p => {
      const text = p.textContent || '';
      const style = p.getAttribute('style') || '';
      
      // Check if this looks like a list item:
      // - Has bullet character (●, •, ◦, ▪, etc.)
      // - Has mso-list in style
      // - Has margin-left and text-indent (Word list formatting)
      const hasBullet = /^[●•◦▪■◆▸►]\s/.test(text.trim());
      const hasMsoList = style.includes('mso-list');
      const hasListIndent = style.includes('margin-left') && style.includes('text-indent');
      
      if (hasBullet || hasMsoList || hasListIndent) {
        // Mark this paragraph as a list item
        p.setAttribute('data-list-item', 'true');
      }
    });
    
    // Group consecutive list items and convert to proper lists
    const markedParagraphs = Array.from(body.querySelectorAll('p[data-list-item="true"]'));
    let currentGroup = [];
    
    markedParagraphs.forEach((p, index) => {
      currentGroup.push(p);
      
      // Check if next element is also a list item
      const nextElement = p.nextElementSibling;
      const isLastInGroup = !nextElement || !nextElement.hasAttribute('data-list-item');
      
      if (isLastInGroup && currentGroup.length > 0) {
        // Create a proper <ul> list
        const ul = body.ownerDocument.createElement('ul');
        
        // Convert each paragraph to <li>
        currentGroup.forEach(listP => {
          const li = body.ownerDocument.createElement('li');
          
          // Move all child nodes to <li> (preserving formatting like spans)
          while (listP.firstChild) {
            const child = listP.firstChild;
            
            // Clean up any mso-list, Word-specific, or problematic styles from child elements
            if (child.nodeType === 1) { // Element node
              const style = child.getAttribute('style') || '';
              if (style) {
                // Remove mso- styles and white-space: pre
                const cleanedStyle = style
                  .split(';')
                  .filter(s => {
                    const trimmed = s.trim();
                    return !trimmed.startsWith('mso-') && 
                           !trimmed.startsWith('white-space');
                  })
                  .join(';')
                  .trim();
                
                if (cleanedStyle) {
                  child.setAttribute('style', cleanedStyle);
                } else {
                  child.removeAttribute('style');
                }
              }
            }
            
            li.appendChild(child);
          }
          
          // Also clean the <li> element itself of white-space: pre
          const liStyle = li.getAttribute('style') || '';
          if (liStyle && liStyle.includes('white-space')) {
            const cleanedLiStyle = liStyle
              .split(';')
              .filter(s => !s.trim().startsWith('white-space'))
              .join(';')
              .trim();
            
            if (cleanedLiStyle) {
              li.setAttribute('style', cleanedLiStyle);
            } else {
              li.removeAttribute('style');
            }
          }
          
          // Clean any white-space: pre from all nested elements
          const nestedElements = Array.from(li.querySelectorAll('[style*="white-space"]'));
          nestedElements.forEach(elem => {
            const elemStyle = elem.getAttribute('style') || '';
            const cleanedStyle = elemStyle
              .split(';')
              .filter(s => !s.trim().startsWith('white-space'))
              .join(';')
              .trim();
            
            if (cleanedStyle) {
              elem.setAttribute('style', cleanedStyle);
            } else {
              elem.removeAttribute('style');
            }
          });
          
          // Unwrap any paragraph tags inside the <li> to avoid double spacing
          // List items should contain inline content, not block-level paragraphs
          const paragraphsInLi = Array.from(li.querySelectorAll('p'));
          paragraphsInLi.forEach(p => {
            // Move all children of the <p> to the parent <li>
            while (p.firstChild) {
              li.insertBefore(p.firstChild, p);
            }
            // Remove the now-empty <p> tag
            p.remove();
          });
          
          // Remove bullet characters from the beginning of text content
          // Check first text node in the <li>
          const walker = body.ownerDocument.createTreeWalker(
            li,
            4, // NodeFilter.SHOW_TEXT
            null
          );
          
          const firstTextNode = walker.nextNode();
          if (firstTextNode && firstTextNode.nodeType === 3) {
            // Remove leading bullets and Word list markers
            firstTextNode.textContent = firstTextNode.textContent
              .replace(/^[●•◦▪■◆▸►]\s*/g, '')  // Remove bullet symbols
              .replace(/^\s*[\w\d]+\.\s*/, ''); // Remove numbered list markers like "1. "
          }
          
          ul.appendChild(li);
        });
        
        // Clean the <ul> element itself of white-space: pre
        const ulStyle = ul.getAttribute('style') || '';
        if (ulStyle && ulStyle.includes('white-space')) {
          const cleanedUlStyle = ulStyle
            .split(';')
            .filter(s => !s.trim().startsWith('white-space'))
            .join(';')
            .trim();
          
          if (cleanedUlStyle) {
            ul.setAttribute('style', cleanedUlStyle);
          } else {
            ul.removeAttribute('style');
          }
        }
        
        // Insert the <ul> before the first paragraph in the group
        const firstP = currentGroup[0];
        firstP.parentNode.insertBefore(ul, firstP);
        
        // Remove all the original paragraphs
        currentGroup.forEach(listP => listP.remove());
        
        listsConverted++;
        currentGroup = [];
      }
    });
    
    if (listsConverted > 0) {
      console.log(`   ✅ Converted ${listsConverted} Microsoft Word-style lists to proper HTML lists`);
    }
    
    // Clean up any remaining lists (not converted from Word) that have white-space: pre
    const allLists = Array.from(body.querySelectorAll('ul, ol'));
    let cleanedLists = 0;
    
    allLists.forEach(list => {
      // Clean the list container
      const listStyle = list.getAttribute('style') || '';
      if (listStyle && listStyle.includes('white-space')) {
        const cleanedStyle = listStyle
          .split(';')
          .filter(s => !s.trim().startsWith('white-space'))
          .join(';')
          .trim();
        
        if (cleanedStyle) {
          list.setAttribute('style', cleanedStyle);
        } else {
          list.removeAttribute('style');
        }
        cleanedLists++;
      }
      
      // Clean all list items and nested elements
      const listItems = Array.from(list.querySelectorAll('li'));
      listItems.forEach(li => {
        const liStyle = li.getAttribute('style') || '';
        if (liStyle && liStyle.includes('white-space')) {
          const cleanedLiStyle = liStyle
            .split(';')
            .filter(s => !s.trim().startsWith('white-space'))
            .join(';')
            .trim();
          
          if (cleanedLiStyle) {
            li.setAttribute('style', cleanedLiStyle);
          } else {
            li.removeAttribute('style');
          }
        }
        
        // Clean nested elements inside list items
        const nestedElements = Array.from(li.querySelectorAll('[style*="white-space"]'));
        nestedElements.forEach(elem => {
          const elemStyle = elem.getAttribute('style') || '';
          const cleanedStyle = elemStyle
            .split(';')
            .filter(s => !s.trim().startsWith('white-space'))
            .join(';')
            .trim();
          
          if (cleanedStyle) {
            elem.setAttribute('style', cleanedStyle);
          } else {
            elem.removeAttribute('style');
          }
        });
      });
    });
    
    if (cleanedLists > 0) {
      console.log(`   ✅ Cleaned white-space: pre from ${cleanedLists} existing lists`);
    }
  }

  /**
   * Add consistent spacing between content elements
   * Applies uniform 20pt margin top and bottom to all content elements for better readability
   * @private
   * @param {Element} body - Document body
   */
  _addContentSpacing(body) {
    console.log('   📏 Adding consistent 20pt spacing between content elements...');
    
    // Uniform spacing for all content elements - increased for better visual separation
    const uniformMargin = '20pt';
    
    // Content elements to apply spacing to
    const contentSelectors = [
      'p',           // Paragraphs
      'h2', 'h3', 'h4', 'h5', 'h6',  // Headings (H1 is removed)
      'ul', 'ol',    // Lists
      'blockquote',  // Blockquotes
      'table',       // Tables
      'img',         // Images
      'iframe',      // Embedded content (videos, etc.)
      'figure',      // Figure elements containing media
      'video',       // Video elements
      'div'          // Divs (but only direct children with text content)
    ];
    
    let totalElementsProcessed = 0;
    
    // Apply spacing to all content elements
    contentSelectors.forEach(selector => {
      const elements = body.querySelectorAll(selector);
      
      elements.forEach(element => {
        // Skip empty elements or elements that are just containers
        const hasTextContent = element.textContent && element.textContent.trim().length > 0;
        const isImage = element.tagName === 'IMG';
        const isTable = element.tagName === 'TABLE';
        const isIframe = element.tagName === 'IFRAME';
        const isFigure = element.tagName === 'FIGURE';
        const isVideo = element.tagName === 'VIDEO';
        
        // Only process elements with actual content or special elements like images/tables/iframes/videos
        if (!hasTextContent && !isImage && !isTable && !isIframe && !isFigure && !isVideo) {
          return;
        }
        
        // Skip nested divs that are part of table-responsive wrappers
        if (element.tagName === 'DIV' && element.classList.contains('table-responsive')) {
          return;
        }
        
        // IMPORTANT: Skip paragraphs inside list items to prevent double spacing
        if (element.tagName === 'P' && element.closest('li')) {
          return;
        }
        
        // Skip large container divs (only apply spacing to small content divs or actual content elements)
        if (element.tagName === 'DIV') {
          // If div has child block elements (p, h2, table, etc), it's a container - skip it
          const hasBlockChildren = element.querySelector('p, h1, h2, h3, h4, h5, h6, table, ul, ol, blockquote, div');
          if (hasBlockChildren) {
            return;
          }
        }
        
        const existingStyle = element.getAttribute('style') || '';
        
        // Remove existing margin-top and margin-bottom styles and replace with uniform spacing
        let newStyle = existingStyle
          // Remove margin-top (handles various formats: margin-top: 0pt, margin-top:20px, etc.)
          .replace(/margin-top\s*:\s*[^;]+;?/gi, '')
          // Remove margin-bottom
          .replace(/margin-bottom\s*:\s*[^;]+;?/gi, '')
          // Clean up any double semicolons or trailing spaces
          .replace(/;\s*;/g, ';')
          .replace(/^\s*;\s*/, '')
          .trim();
        
        // Add uniform margins
        if (newStyle && !newStyle.endsWith(';')) {
          newStyle += '; ';
        }
        newStyle += `margin-top: ${uniformMargin}; margin-bottom: ${uniformMargin}`;
        
        element.setAttribute('style', newStyle);
        totalElementsProcessed++;
      });
    });
    
    console.log(`   ✅ Applied 20pt top/bottom margins to ${totalElementsProcessed} content elements`);
  }

  /**
   * Apply Bootstrap styling to tables
   * @private
   * @param {Element} body - Document body
   */
  _applyBootstrapTables(body) {
    const tables = body.querySelectorAll('table');
    tables.forEach(table => {
      // Remove existing classes and add Bootstrap table classes  
      table.className = '';  // Clear first
      table.removeAttribute('style');
      table.className = 'table table-striped table-bordered';
      
      // Add responsive wrapper if not already wrapped
      if (!table.parentElement.classList.contains('table-responsive')) {
        const wrapper = body.ownerDocument.createElement('div');
        wrapper.setAttribute('class', 'table-responsive');
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
      
      // Clean table cell styles but keep basic structure
      const cells = table.querySelectorAll('td, th');
      cells.forEach(cell => {
        // Remove inline styles but keep essential attributes
        cell.removeAttribute('style');
        cell.removeAttribute('class');
        
        // Add Bootstrap table cell classes if needed
        if (cell.tagName === 'TH') {
          cell.setAttribute('scope', cell.parentElement.rowIndex === 0 ? 'col' : 'row');
        }
        
        // Remove paragraph wrappers in cells if they only contain simple content
        const paragraphs = cell.querySelectorAll('p');
        paragraphs.forEach(p => {
          const hasBlockElements = p.querySelector('div, table, ul, ol, h1, h2, h3, h4, h5, h6');
          if (!hasBlockElements) {
            while (p.firstChild) {
              cell.insertBefore(p.firstChild, p);
            }
            p.remove();
          }
        });
      });
    });
  }

  /**
   * Aggressively clean HTML by removing empty elements and unnecessary nesting
   * @private
   * @param {Element} body - Document body element
   * @returns {Element} Cleaned body element
   */
  _aggressiveCleanup(body) {
    try {
      // Multiple passes to catch nested empty elements
      for (let pass = 0; pass < 5; pass++) {
        
        // Remove empty elements aggressively
        const emptyElements = body.querySelectorAll('div, span, p, strong, em, b, i, u, section, article, header, footer, figure');
        
        emptyElements.forEach(element => {
          // Skip table wrappers
          if (element.classList.contains('table-responsive')) return;
          
          // Skip elements with Bootstrap layout classes - they're structural and should be preserved
          const classAttr = element.getAttribute('class') || '';
          const classList = classAttr.split(/\s+/).filter(c => c);
          const hasBootstrapClass = classList.some(className => this._shouldPreserveClass(className));
          if (hasBootstrapClass) return;
          
          const textContent = element.textContent.trim();
          const hasImportantChildren = element.querySelector('table, img, a, input, button, iframe, video, audio');
          
          // Remove if completely empty or only whitespace/nbsp/br
          if ((!textContent || textContent === '' || textContent === '\u00A0' || textContent === '&nbsp;') && !hasImportantChildren) {
            element.remove();
          }
        });
        
        // Remove empty formatting tags and spans
        const formattingTags = body.querySelectorAll('strong, em, b, i, u, span');
        formattingTags.forEach(element => {
          const text = element.textContent.trim();
          // Remove if empty or only contains breaks/whitespace
          if (!text || text === '' || text === '\u00A0' || text === '&nbsp;' || element.innerHTML.trim() === '<br>' || element.innerHTML.trim() === '<br/>') {
            element.remove();
          }
        });
        
        // Remove empty paragraphs
        const paragraphs = body.querySelectorAll('p');
        paragraphs.forEach(p => {
          const text = p.textContent.trim();
          const hasImportantChildren = p.querySelector('a, img, table, input, button, iframe, video, audio');
          
          if ((!text || text === '' || text === '\u00A0' || text === '&nbsp;') && !hasImportantChildren) {
            p.remove();
          }
        });
        
        // Unwrap unnecessary nested divs and spans
        const containers = body.querySelectorAll('div, span');
        containers.forEach(container => {
          // Skip table wrappers
          if (container.classList.contains('table-responsive')) return;
          
          // Skip elements with Bootstrap layout classes
          const classAttr = container.getAttribute('class') || '';
          const classList = classAttr.split(/\s+/).filter(c => c);
          const hasBootstrapClass = classList.some(className => this._shouldPreserveClass(className));
          if (hasBootstrapClass) return;
          
          // If container has no useful attributes and content, unwrap it
          if (!container.hasAttribute('class') && !container.hasAttribute('id')) {
            const children = Array.from(container.children);
            const textContent = container.textContent.trim();
            
            // If empty, remove completely
            if (!textContent || textContent === '' || textContent === '\u00A0') {
              if (children.length === 0) {
                container.remove();
              } else {
                // Move children up and remove the wrapper
                children.forEach(child => {
                  container.parentNode.insertBefore(child, container);
                });
                container.remove();
              }
            }
            // If it only contains one child of the same type, unwrap it
            else if (children.length === 1 && children[0].tagName === container.tagName) {
              const child = children[0];
              container.parentNode.insertBefore(child, container);
              container.remove();
            }
          }
        });
      }
      
      return body;
        
    } catch (error) {
      console.warn('Error in aggressive cleanup:', error.message);
      return body;
    }
  }


  /**
   * Normalize image URL for deduplication (remove query parameters)
   * @private
   * @param {string} url - Image URL
   * @returns {string} Normalized URL
   */
  _normalizeImageUrl(url) {
    try {
      // Remove query parameters like ?width=767
      return url.split('?')[0];
    } catch (error) {
      return url;
    }
  }

  /**
   * Convert CSS background images to actual img tags
   * Many modern websites use background-image CSS for layout images
   * This method extracts those and converts them to proper img elements for WordPress
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _convertBackgroundImagesToImg(body, filename) {
    let convertedCount = 0;
    let duplicatesSkipped = 0;
    const seenImages = new Map(); // Track normalized URLs -> best variant (prefer without query params)
    
    // Find all elements with background-image in their style attribute
    const allElements = Array.from(body.querySelectorAll('[style*="background-image"]'));
    
    // First pass: collect all images and prefer URLs without query parameters
    allElements.forEach(element => {
      try {
        const style = element.getAttribute('style') || '';
        const bgImageMatch = style.match(/background-image\s*:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
        
        if (bgImageMatch && bgImageMatch[1]) {
          const imageUrl = bgImageMatch[1];
          const normalizedUrl = this._normalizeImageUrl(imageUrl);
          
          const existing = seenImages.get(normalizedUrl);
          if (!existing) {
            // First time seeing this image
            seenImages.set(normalizedUrl, { element, imageUrl });
          } else {
            // We've seen this image before - prefer the one WITHOUT query params
            const hasQueryParams = imageUrl.includes('?');
            const existingHasQueryParams = existing.imageUrl.includes('?');
            
            if (!hasQueryParams && existingHasQueryParams) {
              // Current URL is cleaner - use it instead
              existing.element.remove(); // Remove the old one
              seenImages.set(normalizedUrl, { element, imageUrl });
              duplicatesSkipped++;
            } else {
              // Keep existing, remove current
              element.remove();
              duplicatesSkipped++;
            }
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not process background image: ${error.message}`);
      }
    });
    
    // Second pass: convert the selected images to <img> tags
    seenImages.forEach(({ element, imageUrl }) => {
      try {
        // Get alt text from aria-label if it exists
        const altText = element.getAttribute('aria-label') || '';
        
        // Create a new img element
        const img = body.ownerDocument.createElement('img');
        img.setAttribute('src', imageUrl);
        if (altText) {
          img.setAttribute('alt', altText);
        }
        
        // Copy loading attribute if present
        const loading = element.getAttribute('loading');
        if (loading) {
          img.setAttribute('loading', loading);
        }
        
        // Replace the div with the img element
        element.parentNode.replaceChild(img, element);
        convertedCount++;
      } catch (error) {
        console.warn(`   ⚠️ Could not convert background image: ${error.message}`);
      }
    });
    
    if (convertedCount > 0) {
      console.log(`   🖼️  Converted ${convertedCount} CSS background images to <img> tags`);
    }
    
    if (duplicatesSkipped > 0) {
      console.log(`   🔄 Skipped ${duplicatesSkipped} duplicate responsive background images`);
    }
  }

  /**
   * Remove sidebar and navigation elements by class names
   * Must be called BEFORE _cleanElement removes all classes
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _removeSidebarElements(body, filename) {
    let removedCount = 0;
    
    // Sidebar and navigation class patterns to remove
    const sidebarClassPatterns = [
      'navboxwrap',
      'navboxright',
      'navbox',
      'sidebar',
      'widget-area',
      'blog-sidebar',
      'post-navigation',
      'entry-navigation',
      'nav-links',
      'navigation',
      'archives',
      'categories',
      'meta-links',
      'blogroll'
    ];
    
    // Convert to Array to avoid live NodeList issues
    const allElements = Array.from(body.querySelectorAll('*'));
    const elementsToRemove = [];
    
    allElements.forEach(element => {
      try {
        // Skip if element is no longer in DOM
        if (!element.parentNode) return;
        
        const className = element.getAttribute('class') || '';
        const classLower = className.toLowerCase();
        
        // Check if element has any of the sidebar class patterns
        const hasSidebarClass = sidebarClassPatterns.some(pattern => 
          classLower.includes(pattern.toLowerCase())
        );
        
        if (hasSidebarClass) {
          elementsToRemove.push(element);
        }
      } catch (error) {
        console.warn(`   ⚠️ Error checking sidebar element: ${error.message}`);
      }
    });
    
    // Remove identified elements
    elementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          removedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove sidebar element: ${error.message}`);
      }
    });
    
    if (removedCount > 0) {
      console.log(`   🗑️  Removed ${removedCount} sidebar/navigation elements`);
    }
  }

  /**
   * Remove elements matching custom selectors provided by user
   * Must be called BEFORE _cleanElement removes all classes/ids
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _removeCustomSelectors(body, filename) {
    if (!this.customRemoveSelectors || this.customRemoveSelectors.length === 0) {
      return;
    }

    let removedCount = 0;
    const elementsToRemove = [];

    // Try each selector and collect matching elements
    this.customRemoveSelectors.forEach(selector => {
      try {
        const matches = Array.from(body.querySelectorAll(selector));
        matches.forEach(element => {
          // Avoid duplicates
          if (!elementsToRemove.includes(element)) {
            elementsToRemove.push(element);
          }
        });
      } catch (error) {
        console.warn(`   ⚠️ Invalid selector "${selector}": ${error.message}`);
      }
    });

    // Remove all collected elements
    elementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          removedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove element matching custom selector: ${error.message}`);
      }
    });

    if (removedCount > 0) {
      console.log(`   🎯 Removed ${removedCount} element(s) matching custom selector(s)`);
    }
  }

  /**
   * Remove date display elements from content
   * Dates are already extracted for post_date, so they shouldn't appear in content
   * Must be called BEFORE _cleanElement removes all classes
   * @private
   * @param {Document} body - Document body
   * @param {string} filename - Filename for logging
   */
  _removeDateElements(body, filename) {
    let removedCount = 0;
    
    // Date class patterns to identify and remove
    const dateClassPatterns = [
      'dateDiv',
      'date-div',
      'post-date',
      'entry-date',
      'published',
      'publish-date',
      'article-date',
      'date-posted'
    ];
    
    // Convert to Array to avoid live NodeList issues
    const allElements = Array.from(body.querySelectorAll('*'));
    const elementsToRemove = [];
    
    allElements.forEach(element => {
      try {
        // Skip if element is no longer in DOM
        if (!element.parentNode) return;
        
        const className = element.getAttribute('class') || '';
        const classLower = className.toLowerCase();
        
        // Check if element has any of the date class patterns
        const hasDateClass = dateClassPatterns.some(pattern => 
          classLower.includes(pattern.toLowerCase())
        );
        
        if (hasDateClass) {
          // Additional validation: check if content looks like a date
          const textContent = element.textContent?.trim() || '';
          
          // Date format patterns
          const datePatterns = [
            /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}$/i,
            /^\d{1,2}\/\d{1,2}\/\d{4}$/,
            /^\d{4}-\d{2}-\d{2}$/,
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}$/i
          ];
          
          const looksLikeDate = datePatterns.some(pattern => pattern.test(textContent));
          
          // Only remove if it has date class AND looks like a date (not too long)
          if (looksLikeDate || textContent.length < 50) {
            elementsToRemove.push(element);
          }
        }
      } catch (error) {
        console.warn(`   ⚠️ Error checking date element: ${error.message}`);
      }
    });
    
    // Remove identified elements
    elementsToRemove.forEach(element => {
      try {
        if (element.parentNode) {
          element.remove();
          removedCount++;
        }
      } catch (error) {
        console.warn(`   ⚠️ Could not remove date element: ${error.message}`);
      }
    });
    
    if (removedCount > 0) {
      console.log(`   📅 Removed ${removedCount} date display elements`);
    }
  }

  /**
   * Process single HTML file for WordPress
   * @private
   * @param {string} filename - HTML filename
   * @param {Object} imageMapping - Image mapping data
   * @param {Object} dealerConfig - Dealer configuration
   * @returns {Promise<Object>} Processing result
   */
  async _processHtmlFile(filename, imageMapping, dealerConfig) {
    const inputPath = path.join(config.resolvePath(this.config.inputDir), filename);
    const outputPath = path.join(config.resolvePath(this.config.outputDir), filename);
    
    console.log(`\n🔧 Processing: ${filename}`);
    
    try {
      const html = await fs.readFile(inputPath, 'utf-8');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      const body = document.body || document.documentElement;
      
      // Extract base domain from filename for link processing
      let baseUrl = filename.replace('.html', '');
      
      // Extract domain portion from filename
      // Filenames can be in format: www.domain.com_page-slug or www_domain_com_page-slug
      const parts = baseUrl.split('_');
      
      // If first part contains periods, it's already a properly formatted domain
      if (parts[0].includes('.')) {
        baseUrl = parts[0];
      }
      // Otherwise, parse underscore-separated domain parts
      else if (parts.length >= 3) {
        // Find domain parts (typically www_domain_com or domain_com pattern)
        let domainParts = [];
        for (let i = 0; i < parts.length; i++) {
          domainParts.push(parts[i]);
          // Stop when we hit 'com', 'org', 'net', etc. or after 3 parts
          if (parts[i].match(/^(com|org|net|edu|gov|co|io)$/) || domainParts.length >= 3) {
            break;
          }
        }
        baseUrl = domainParts.join('_');
        
        // Convert underscore format to proper domain format
        baseUrl = baseUrl
          .replace(/^www_/, 'www.')
          .replace(/_/g, '.')
          .replace(/\.$/, ''); // Remove trailing dot if any
      }
      
      console.log(`   🌐 Detected base domain: ${baseUrl}`);
      
      // IMPORTANT: Detect content type BEFORE cleaning (needs original classes)
      const contentType = this._detectContentType(html, filename);
      console.log(`   📝 Content type: ${contentType.type} (${contentType.confidence}% confidence) - ${contentType.reason}`);
      
      // STEP 0: Convert CSS background images to actual img tags (before cleaning removes styles)
      this._convertBackgroundImagesToImg(body, filename);
      
      // STEP 1: Remove elements by class BEFORE cleaning removes all classes
      // This must happen first while we can still identify elements by their classes
      this._removeCustomSelectors(body, filename);
      this._removeSidebarElements(body, filename);
      this._removeDateElements(body, filename);
      
      // STEP 2: Remove post-specific blocks (while classes still exist)
      if (contentType.type === 'post') {
        this._removeDealershipBlocks(body, filename);
        this._removeTestimonialBlocks(body, filename);
        this._removeBlogElements(body, filename);
      }
      
      // STEP 3: Remove forms and footers (before cleaning)
      this._removeForms(body);
      this._removeFooters(body);
      
      // STEP 4: Now clean all elements - remove unwanted attributes and classes
      // Convert to Array to avoid issues with live NodeLists
      const allElements = Array.from(body.querySelectorAll('*'));
      allElements.forEach(element => {
        this._cleanElement(element);
      });

      // Remove any remaining images if bypassing (in case they weren't caught by _cleanElement)
      if (this.bypassImages) {
        // Convert to Array to avoid live NodeList issues
        const remainingImages = Array.from(body.querySelectorAll('img, picture'));
        let imageRemoveCount = 0;
        remainingImages.forEach(img => {
          try {
            if (img.parentNode) {
              img.remove();
              imageRemoveCount++;
            }
          } catch (error) {
            console.warn(`   ⚠️ Could not remove image: ${error.message}`);
          }
        });
        if (imageRemoveCount > 0) {
          console.log(`   🚫 Removed ${imageRemoveCount} images (bypassed)`);
        }
      }
      
      // STEP 5: Update links (after cleaning but preserving href attributes)
      this._updateLinks(body, baseUrl);
      
      // STEP 6: Update image sources
      this._updateImageSources(body, imageMapping, dealerConfig);
      
      // STEP 7: Remove third-party copyright information
      this._removeCopyright(body);
      
      // Remove H1 tags since WordPress handles titles automatically
      // Convert to Array to avoid live NodeList issues
      const h1Elements = Array.from(body.querySelectorAll('h1'));
      h1Elements.forEach(h1 => {
        try {
          if (h1.parentNode) {
            h1.remove();
          }
        } catch (error) {
          console.warn(`   ⚠️ Could not remove H1 element: ${error.message}`);
        }
      });
      
      // Convert Microsoft Word-style lists to proper HTML lists
      this._convertWordListsToHtml(body);
      
      // Apply Bootstrap table styling
      this._applyBootstrapTables(body);
      
      // Add consistent spacing between content elements
      this._addContentSpacing(body);
      
      // Apply aggressive cleanup to remove empty elements and unnecessary nesting
      const cleanedBody = this._aggressiveCleanup(body);
      
      // Get final HTML
      const cleanHtml = cleanedBody.innerHTML;
      
      // Log Bootstrap class preservation summary
      const classMatches = cleanHtml.match(/class="[^"]+"/g) || [];
      if (classMatches.length > 0) {
        console.log(`   ✨ Preserved ${classMatches.length} Bootstrap layout classes`);
      }
      
      // Save processed file
      await fs.writeFile(outputPath, cleanHtml, 'utf-8');
      
      console.log(`   ✅ Sanitized and saved to clean-content/`);
      
      return {
        filename,
        originalSize: html.length,
        cleanSize: cleanHtml.length,
        reduction: ((html.length - cleanHtml.length) / html.length * 100).toFixed(1),
        success: true
      };
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filename}: ${error.message}`);
      return {
        filename,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Get dealer configuration from environment or user input
   * @private
   * @returns {Promise<Object|null>} Dealer configuration or null if bypassed
   */
  async _getDealerConfig() {
    // Check if images are being bypassed
    if (this.bypassImages) {
      console.log('🚫 Images bypassed - skipping dealer configuration');
      return null;
    }
    
    // Try to get from environment variables first
    const dealerSlug = process.env.DEALER_SLUG;
    const year = process.env.UPLOAD_YEAR;
    const month = process.env.UPLOAD_MONTH;

    if (dealerSlug && year && month) {
      return { dealerSlug, year, month };
    }

    // If not in environment, this would normally prompt user
    // For now, return null to skip image path updates
    console.log('⚠️  No dealer configuration found - image paths will not be updated');
    return null;
  }

  /**
   * Process all content files - sanitize scraped HTML (remove classes, styles, update links)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processContent(options = {}) {
    try {
      console.log('🧹 Starting HTML Sanitization for WordPress');
      console.log(`📁 Input: ${this.config.inputDir}/ (scraped HTML)`);
      console.log(`💾 Output: ${this.config.outputDir}/ (sanitized HTML)`);
      
      if (!this.bypassImages) {
        console.log(`🖼️  Images: ${this.config.imageDir}/`);
      } else {
        console.log('🖼️  Images: BYPASSED');
      }

      // Check input directory
      const inputDir = config.resolvePath(this.config.inputDir);
      const inputExists = await fs.pathExists(inputDir);
      
      if (!inputExists) {
        throw new ProcessingError(`Input directory not found: ${this.config.inputDir}. Run the scraper first to generate HTML files!`);
      }

      // Get HTML files
      const htmlFiles = await getFiles(inputDir, '.html');

      if (htmlFiles.length === 0) {
        throw new ProcessingError(`No HTML files found in ${this.config.inputDir}`);
      }

      console.log(`📄 Found ${htmlFiles.length} HTML files to sanitize`);

      // Load image mapping (only if not bypassed)
      let imageMapping = { images: [] };
      if (!this.bypassImages) {
        const imageMappingPath = config.resolvePath(this.config.imageMappingFile);
        if (await fs.pathExists(imageMappingPath)) {
          imageMapping = await readJSON(imageMappingPath, { images: [] });
          console.log(`📸 Loaded ${imageMapping.images.length} image mappings`);
        } else {
          console.log('⚠️  No image mapping found - image links will not be updated');
        }
      } else {
        console.log('📸 Image mapping skipped - images bypassed');
      }

      // Get dealer configuration (returns null if bypassed)
      const dealerConfig = await this._getDealerConfig();
      
      if (dealerConfig) {
        console.log(`\n🏢 Dealer: ${dealerConfig.dealerSlug}`);
        console.log(`📅 Image date path: ${dealerConfig.year}/${dealerConfig.month}`);
      }

      // Create output directory
      await ensureDir(config.resolvePath(this.config.outputDir));

      // Process each file
      const results = [];
      const progress = new ProgressTracker(htmlFiles.length, 'Sanitizing HTML files');
      
      for (const filename of htmlFiles) {
        const result = await this._processHtmlFile(filename, imageMapping, dealerConfig);
        results.push(result);
        progress.update(1, result.success ? '✅' : '❌');
      }
      
      progress.complete();

      // Generate summary
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      console.log('\n📊 SANITIZATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`✅ Successful: ${successful.length}/${htmlFiles.length}`);
      console.log(`❌ Failed: ${failed.length}/${htmlFiles.length}`);

      if (successful.length > 0) {
        const avgReduction = (successful.reduce((sum, r) => sum + parseFloat(r.reduction), 0) / successful.length).toFixed(1);
        console.log(`📉 Average size reduction: ${avgReduction}%`);
      }

      // Save processing summary
      const summary = {
        timestamp: new Date().toISOString(),
        dealerConfig,
        bypassImages: this.bypassImages,
        totalFiles: htmlFiles.length,
        successful: successful.length,
        failed: failed.length,
        results
      };

      const summaryPath = path.join(config.resolvePath(this.config.outputDir), 'processing-summary.json');
      await writeJSON(summaryPath, summary);

      return summary;

    } catch (error) {
      throw new ProcessingError('Content processing failed', null, error);
    }
  }

  /**
   * Check if processed content already exists
   * @returns {Promise<number>} Number of existing processed HTML files
   */
  async checkExistingContent() {
    const outputDir = config.resolvePath(this.config.outputDir);
    const htmlFiles = await getFiles(outputDir, '.html');
    return htmlFiles.length;
  }
}
