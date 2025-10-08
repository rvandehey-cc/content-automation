/**
 * @fileoverview Content processing service for WordPress
 * @author Content Automation Team
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
  }

  /**
   * Clean unwanted attributes and classes from HTML elements
   * AGGRESSIVE APPROACH: Remove ALL classes and IDs, keep only styles and essential attributes
   * @private
   * @param {Element} element - DOM element to clean
   */
  _cleanElement(element) {
    // Remove images if bypassing image processing
    if (this.bypassImages && (element.tagName === 'IMG' || element.tagName === 'PICTURE')) {
      element.remove();
      return;
    }

    // AGGRESSIVE CLEANING: Remove ALL class attributes
    if (element.hasAttribute('class')) {
      element.removeAttribute('class');
    }

    // AGGRESSIVE CLEANING: Remove ALL id attributes  
    if (element.hasAttribute('id')) {
      element.removeAttribute('id');
    }

    // Define attributes to keep based on element type
    const attributesToKeep = ['style']; // Always keep inline styles
    
    // Keep essential attributes based on element type
    if (element.tagName === 'A') {
      attributesToKeep.push('href', 'target');
    } else if (element.tagName === 'IMG') {
      attributesToKeep.push('src', 'alt', 'width', 'height');
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
      if (hrefLower.includes('/new-') || hrefLower.includes('new-inventory') || hrefLower.includes('search/new') || hrefLower.includes('new')) {
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
      } else if (hrefLower.includes('contact')) {
        newHref = '/contact-us/';
        linksProcessed.contact++;
        console.log(`   📞 Contact link: ${href} → ${newHref}`);
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
    console.log(`      🚗 New vehicles: ${linksProcessed.newVehicles}`);
    console.log(`      🔧 Used vehicles: ${linksProcessed.usedVehicles}`);
    console.log(`      🏆 Certified: ${linksProcessed.certified}`);
    console.log(`      📞 Contact: ${linksProcessed.contact}`);
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
    if (!dealerConfig || this.bypassImages) {
      return;
    }
    
    const images = element.querySelectorAll('img[src]');
    
    images.forEach(img => {
      const src = img.getAttribute('src');
      
      // Find matching image in mapping
      const imageMatch = imageMapping.images.find(item => 
        item.originalUrl === src || item.originalUrl.endsWith(src)
      );
      
      if (imageMatch) {
        // Update to WordPress upload path
        const wpPath = `/wp-content/uploads/${dealerConfig.year}/${dealerConfig.month}/${imageMatch.filename}`;
        img.setAttribute('src', wpPath);
      }
    });
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
      const className = element.className || '';
      if (typeof className === 'string' && 
          /(sidebar|widget|recent|categories|archive|meta|nav|breadcrumb|comment)/i.test(className)) {
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
    
    // Remove iframes (often dealer maps, embedded content)
    // Convert to Array to avoid live NodeList issues
    const iframes = Array.from(body.querySelectorAll('iframe'));
    iframes.forEach(iframe => {
      try {
        if (iframe.parentNode) {
          iframe.remove();
          removedCount++;
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
    
    // Remove test drive sections - be more specific to avoid removing large containers
    const paragraphs = body.querySelectorAll('p');
    paragraphs.forEach(element => {
      const text = element.textContent || '';
      const textLower = text.toLowerCase().trim();
      
      // Only remove if the entire paragraph is primarily dealer content (not just mentions)
      // Test drive calls-to-action - only if it's the main focus of the paragraph
      if (textLower.includes('test drive') && 
          (textLower.includes('take the') || textLower.includes('schedule')) &&
          text.length < 300) { // Don't remove long paragraphs that just mention it
        element.remove();
        removedCount++;
        return;
      }
      
      // Dealership contact information with phone numbers - only dedicated contact paragraphs
      if (textLower.includes('call') && 
          (textLower.includes('delray') || textLower.includes('hyundai') || textLower.includes('today')) &&
          /\(\d{3}\)\s*\d{3}-\d{4}/.test(text) &&
          text.length < 200) { // Don't remove long content paragraphs
        element.remove();
        removedCount++;
        return;
      }
      
      // Address and location information - only if it's primarily address content
      if (((/\d+\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|boulevard)/i.test(text) &&
           textLower.includes('fl')) ||
          (textLower.includes('visit') && textLower.includes('showroom'))) &&
          text.length < 150) {
        element.remove();
        removedCount++;
        return;
      }
      
      // "Get a personal tour" or similar dealership marketing - only short marketing blurbs
      if ((textLower.includes('get a personal') || 
          textLower.includes('come down to') ||
          textLower.includes('stop by') && textLower.includes('dealership') ||
          textLower.includes('our friendly staff')) &&
          text.length < 200) {
        element.remove();
        removedCount++;
        return;
      }
      
      // Hours of operation - only dedicated hours paragraphs
      if ((textLower.includes('hours') && textLower.includes('open') ||
          (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(text) && 
          /\d{1,2}:\d{2}/i.test(text))) &&
          text.length < 200) {
        element.remove();
        removedCount++;
        return;
      }
    });
    
    // Remove links to inventory or dealership pages
    const links = body.querySelectorAll('a');
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      const textLower = text.toLowerCase();
      
      if (textLower.includes('inventory') || 
          textLower.includes('browse') || 
          href.includes('/new-vehicles/') ||
          href.includes('/search/') ||
          href.includes('/contact') ||
          href.includes('/directions')) {
        // Replace link with just the text content or remove entirely
        if (textLower.includes('inventory') || 
            textLower.includes('browse') ||
            textLower.includes('contact') ||
            textLower.includes('directions')) {
          link.remove();
          removedCount++;
        } else {
          // Keep text but remove link
          const textNode = body.ownerDocument.createTextNode(text);
          link.parentNode.replaceChild(textNode, link);
        }
      }
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
        else if (element.tagName !== 'P' && (
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
   * Apply Bootstrap styling to tables
   * @private
   * @param {Element} body - Document body
   */
  _applyBootstrapTables(body) {
    const tables = body.querySelectorAll('table');
    tables.forEach(table => {
      // Remove existing classes and add Bootstrap table classes
      table.removeAttribute('class');
      table.removeAttribute('style');
      table.setAttribute('class', 'table table-striped table-bordered');
      
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
        const emptyElements = body.querySelectorAll('div, span, p, strong, em, b, i, u, section, article, header, footer');
        
        emptyElements.forEach(element => {
          // Skip table wrappers
          if (element.classList.contains('table-responsive')) return;
          
          const textContent = element.textContent.trim();
          const hasImportantChildren = element.querySelector('table, img, a, input, button, iframe');
          
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
          const hasImportantChildren = p.querySelector('a, img, table, input, button');
          
          if ((!text || text === '' || text === '\u00A0' || text === '&nbsp;') && !hasImportantChildren) {
            p.remove();
          }
        });
        
        // Unwrap unnecessary nested divs and spans
        const containers = body.querySelectorAll('div, span');
        containers.forEach(container => {
          // Skip table wrappers
          if (container.classList.contains('table-responsive')) return;
          
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
      
      // Extract domain portion (everything before the third underscore or first content indicator)
      const parts = baseUrl.split('_');
      if (parts.length >= 3) {
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
      }
      
      // Convert to proper domain format
      baseUrl = baseUrl
        .replace(/^www_/, 'www.')
        .replace(/_/g, '.')
        .replace(/\.$/, ''); // Remove trailing dot if any
      
      console.log(`   🌐 Detected base domain: ${baseUrl}`);
      
      // Clean all elements - remove unwanted attributes and classes
      const allElements = body.querySelectorAll('*');
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
      
      // Update links
      this._updateLinks(body, baseUrl);
      
      // Update image sources
      this._updateImageSources(body, imageMapping, dealerConfig);
      
      // Remove forms and footers
      this._removeForms(body);
      this._removeFooters(body);
      
      // Remove third-party copyright information
      this._removeCopyright(body);
      
      // Detect content type and remove post-specific blocks
      const contentType = this._detectContentType(html, filename);
      console.log(`   📝 Content type: ${contentType.type} (${contentType.confidence}% confidence) - ${contentType.reason}`);
      
      if (contentType.type === 'post') {
        this._removeDealershipBlocks(body, filename);
        this._removeTestimonialBlocks(body, filename);
        this._removeBlogElements(body, filename);
      }
      
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
      
      // Apply Bootstrap table styling
      this._applyBootstrapTables(body);
      
      // Apply aggressive cleanup to remove empty elements and unnecessary nesting
      const cleanedBody = this._aggressiveCleanup(body);
      
      // Get final HTML
      const cleanHtml = cleanedBody.innerHTML;
      
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
