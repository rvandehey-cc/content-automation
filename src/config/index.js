/**
 * @fileoverview Centralized configuration management for the content automation system
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Default configuration values
 * @type {Object}
 */
const DEFAULTS = {
  // Scraper Configuration
  scraper: {
    headless: true,
    timeout: 60000,
    maxRetries: 2,
    concurrency: 1,
    waitTime: 3000,
    outputDir: 'output/scraped-content',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
  },

  // Image Downloader Configuration
  images: {
    enabled: true,
    outputDir: 'output/images',
    maxConcurrent: 5,
    timeout: 30000,
    retryAttempts: 2,
    autoConvertAvif: true, // Convert AVIF to JPEG by default for WordPress compatibility
    allowedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif'],
    mappingFile: 'image-mapping.json'
  },

  // Content Processor Configuration
  processor: {
    inputDir: 'output/scraped-content',
    outputDir: 'output/clean-content',
    imageDir: 'output/images',
    imageMappingFile: 'output/images/image-mapping.json'
  },

  // CSV Generator Configuration (for Really Simple CSV Importer)
  csv: {
    inputDir: 'output/scraped-content',
    outputDir: 'output/wp-ready',
    outputFile: 'wordpress-import.csv',
    customSelectors: null // Will be populated by user input for post/page detection
  },

  // Data Files
  data: {
    urlsFile: 'data/urls.txt',
    contentTypeMappings: 'data/content-type-mappings.json',
    urlMappings: 'data/url-mappings.json'
  }
};

/**
 * Configuration class for managing application settings
 */
class Config {
  constructor() {
    this.config = this._loadConfig();
  }

  /**
   * Load configuration from environment variables and defaults
   * @private
   * @returns {Object} The loaded configuration
   */
  _loadConfig() {
    return {
      scraper: {
        headless: process.env.SCRAPER_HEADLESS !== 'false',
        timeout: parseInt(process.env.SCRAPER_TIMEOUT) || DEFAULTS.scraper.timeout,
        maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES) || DEFAULTS.scraper.maxRetries,
        concurrency: parseInt(process.env.SCRAPER_CONCURRENCY) || DEFAULTS.scraper.concurrency,
        waitTime: parseInt(process.env.SCRAPER_WAIT_TIME) || DEFAULTS.scraper.waitTime,
        outputDir: process.env.SCRAPER_OUTPUT_DIR || DEFAULTS.scraper.outputDir,
        userAgent: process.env.SCRAPER_USER_AGENT || DEFAULTS.scraper.userAgent
      },

      images: {
        enabled: process.env.BYPASS_IMAGES !== 'true',
        outputDir: process.env.IMAGES_OUTPUT_DIR || DEFAULTS.images.outputDir,
        maxConcurrent: parseInt(process.env.IMAGES_MAX_CONCURRENT) || DEFAULTS.images.maxConcurrent,
        timeout: parseInt(process.env.IMAGES_TIMEOUT) || DEFAULTS.images.timeout,
        retryAttempts: parseInt(process.env.IMAGES_RETRY_ATTEMPTS) || DEFAULTS.images.retryAttempts,
        autoConvertAvif: process.env.IMAGES_AUTO_CONVERT_AVIF !== 'false', // Default true for WordPress
        allowedFormats: DEFAULTS.images.allowedFormats,
        mappingFile: DEFAULTS.images.mappingFile
      },

      processor: {
        inputDir: process.env.PROCESSOR_INPUT_DIR || DEFAULTS.processor.inputDir,
        outputDir: process.env.PROCESSOR_OUTPUT_DIR || DEFAULTS.processor.outputDir,
        imageDir: process.env.PROCESSOR_IMAGE_DIR || DEFAULTS.processor.imageDir,
        imageMappingFile: process.env.PROCESSOR_IMAGE_MAPPING || DEFAULTS.processor.imageMappingFile,
        dealerSlug: process.env.DEALER_SLUG,
        imageYear: process.env.IMAGE_YEAR,
        imageMonth: process.env.IMAGE_MONTH,
        nonInteractive: process.env.NON_INTERACTIVE === 'true'
      },

      csv: {
        inputDir: process.env.CSV_INPUT_DIR || DEFAULTS.csv.inputDir,
        outputDir: process.env.CSV_OUTPUT_DIR || DEFAULTS.csv.outputDir,
        outputFile: process.env.CSV_OUTPUT_FILE || DEFAULTS.csv.outputFile
      },

      data: {
        urlsFile: process.env.URLS_FILE || DEFAULTS.data.urlsFile,
        contentTypeMappings: process.env.CONTENT_TYPE_MAPPINGS || DEFAULTS.data.contentTypeMappings,
        urlMappings: process.env.URL_MAPPINGS || DEFAULTS.data.urlMappings
      }
    };
  }

  /**
   * Get configuration for a specific module
   * @param {string} module - The module name (scraper, images, processor, xml, data)
   * @returns {Object} The module configuration
   */
  get(module) {
    return this.config[module] || {};
  }

  /**
   * Get the entire configuration object
   * @returns {Object} The complete configuration
   */
  getAll() {
    return this.config;
  }

  /**
   * Update configuration at runtime
   * @param {string} module - The module name
   * @param {Object} updates - The configuration updates
   */
  update(module, updates) {
    if (this.config[module]) {
      this.config[module] = { ...this.config[module], ...updates };
    }
  }

  /**
   * Validate that required configuration is present
   * @returns {Array} Array of validation errors (empty if valid)
   */
  validate() {
    const errors = [];

    // Add specific validation rules as needed
    const processor = this.config.processor;
    if (!processor.nonInteractive && processor.enabled && (!processor.dealerSlug || !processor.imageYear || !processor.imageMonth)) {
      errors.push('Missing required dealer configuration for image processing');
    }

    return errors;
  }

  /**
   * Resolve relative paths to absolute paths
   * @param {string} relativePath - The relative path to resolve
   * @returns {string} The absolute path
   */
  resolvePath(relativePath) {
    return path.resolve(process.cwd(), relativePath);
  }
}

// Export singleton instance
const config = new Config();

export default config;
export { Config };
