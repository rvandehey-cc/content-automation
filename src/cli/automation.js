#!/usr/bin/env node

/**
 * @fileoverview Main CLI application for content automation
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { HTMLScraperService } from '../core/scraper.js';
import { ImageDownloaderService } from '../core/image-downloader.js';
import { ContentProcessorService } from '../core/processor.js';
import { CSVGeneratorService } from '../core/csv-generator.js';
import { cli } from '../utils/cli.js';
import { handleError } from '../utils/errors.js';
import { getFiles, exists, writeJSON, readJSON } from '../utils/filesystem.js';
import config from '../config/index.js';

/**
 * Content Automation Pipeline
 * Main orchestrator for the entire content automation workflow
 */
class ContentAutomationPipeline {
  constructor() {
    this.scraperService = new HTMLScraperService();
    this.imageService = new ImageDownloaderService();
    this.processorService = new ContentProcessorService();
    this.csvService = new CSVGeneratorService();
    this.bypassImages = false;
    
    // Track failures across the pipeline
    this.failedUrls = [];
    this.failedFiles = [];
    this.failedImages = [];
  }

  /**
   * Ask user for content type identification selectors
   * @private
   * @returns {Promise<Object>} Selectors for identifying posts vs pages
   */
  async _getContentTypeSelectors() {
    console.log('\n🎯 CONTENT TYPE IDENTIFICATION');
    console.log('To accurately identify whether scraped content should be WordPress posts or pages,');
    console.log('you can provide CSS selectors that are unique to posts vs pages on the target site.');
    console.log('');
    
    // Check if we have existing selectors from a previous run
    let existingSelectors = null;
    try {
      const selectorsPath = config.resolvePath('data/custom-selectors.json');
      if (await exists(selectorsPath)) {
        existingSelectors = await readJSON(selectorsPath, {});
        if (Object.keys(existingSelectors).length > 0) {
          console.log('📋 Found existing custom selectors:');
          if (existingSelectors.post) console.log(`   📝 Post: ${existingSelectors.post}`);
          if (existingSelectors.page) console.log(`   📄 Page: ${existingSelectors.page}`);
          console.log('');
          
          const useExisting = await cli.askPermission(
            'Use the existing custom selectors?',
            true
          );
          
          if (useExisting) {
            config.update('csv', { customSelectors: existingSelectors });
            console.log('✅ Using existing custom selectors');
            return existingSelectors;
          }
        }
      }
    } catch (error) {
      console.warn('Could not load existing selectors:', error.message);
    }
    
    const useCustomSelectors = await cli.askPermission(
      'Do you want to specify custom selectors to identify posts vs pages?',
      false
    );
    
    if (!useCustomSelectors) {
      console.log('⏭️  Will use automatic detection based on content patterns');
      return null;
    }
    
    console.log('\n📋 Please provide CSS selectors or classes that help identify content types:');
    console.log('Examples:');
    console.log('  • Post indicators: .article-header, .blog-post, article.post');
    console.log('  • Page indicators: .page-header, .static-page, .about-page');
    console.log('');
    
    const selectors = {};
    
    // Ask for post selectors
    const postSelector = await cli.askInput(
      '📝 Class name that indicates a POST (e.g., "post-navigation" from <div class="post-navigation">) - leave empty to skip:',
      existingSelectors?.post || ''
    );
    
    if (postSelector.trim()) {
      selectors.post = postSelector.trim();
      console.log(`✅ Post selector: ${selectors.post}`);
    }
    
    // Ask for page selectors  
    const pageSelector = await cli.askInput(
      '📄 Class name that indicates a PAGE (e.g., "page-header" from <div class="page-header">) - leave empty to skip:',
      existingSelectors?.page || ''
    );
    
    if (pageSelector.trim()) {
      selectors.page = pageSelector.trim();
      console.log(`✅ Page selector: ${selectors.page}`);
    }
    
    if (Object.keys(selectors).length === 0) {
      console.log('⏭️  No selectors provided - will use automatic detection');
      return null;
    }
    
    // Save selectors to config for reuse - MUST UPDATE BOTH CSV AND PROCESSOR CONFIGS
    config.update('csv', { customSelectors: selectors });
    config.update('processor', { customSelectors: selectors });
    
    // Also save to a persistent file for future runs
    try {
      const selectorsPath = config.resolvePath('data/custom-selectors.json');
      await writeJSON(selectorsPath, selectors);
      console.log('💾 Custom selectors saved to data/custom-selectors.json for future use');
    } catch (error) {
      console.warn('Could not save selectors to file:', error.message);
    }
    
    console.log('\n✅ Custom selectors configured successfully!');
    return selectors;
  }

  /**
   * Run the complete automation pipeline
   * @returns {Promise<void>}
   */
  async run() {
    try {
      console.log('🎯 CONTENT AUTOMATION PIPELINE');
      console.log('='.repeat(80));
      
      // Ask user about image processing
      this.bypassImages = await cli.askPermission(
        'Do you want to completely bypass all image processing? (This will skip image downloads, image URL updates in HTML, and all image-related processing)',
        false
      );
      
      // Update configuration based on user choice
      config.update('images', { enabled: !this.bypassImages });
      
      // Ask for content type identification selectors
      await this._getContentTypeSelectors();
      
      this._displayPipelineInfo();
      
      // Step 1: HTML Scraping
      await this._runScrapingStep();
      
      // Step 2: Image Processing (conditional)
      if (!this.bypassImages) {
        await this._runImageProcessingStep();
      } else {
        console.log('\n⏭️  STEP 2 SKIPPED: Image processing bypassed by user');
      }
      
      // Step 3: Content Processing
      await this._runContentProcessingStep();
      
      // Step 4: XML Generation
      await this._runCSVGenerationStep();
      
      // Final Summary
      await this._displayFinalSummary();
      
    } catch (error) {
      const errorInfo = handleError(error, { pipeline: 'main' });
      cli.displayError(`Pipeline failed: ${errorInfo.userMessage}`);
      process.exit(1);
    }
  }

  /**
   * Display pipeline information based on configuration
   * @private
   */
  _displayPipelineInfo() {
    if (this.bypassImages) {
      cli.displayInfo('This automated pipeline will', [
        '1️⃣  Scrape HTML content from specified URLs',
        '2️⃣  Sanitize HTML (remove custom classes, inline styles, update links)',
        '3️⃣  Generate WordPress CSV import file from sanitized content',
        '',
        '⚠️  Image processing BYPASSED - Images will not be downloaded or updated in content'
      ]);
    } else {
      cli.displayInfo('This automated pipeline will', [
        '1️⃣  Scrape HTML content from specified URLs',
        '2️⃣  Extract and download all images',
        '3️⃣  Sanitize HTML (remove custom classes, inline styles, update links & images)',
        '4️⃣  Generate WordPress CSV import file from sanitized content'
      ]);
    }
  }

  /**
   * Run the HTML scraping step
   * @private
   * @returns {Promise<void>}
   */
  async _runScrapingStep() {
    cli.displayStepHeader(1, 'HTML CONTENT SCRAPING', 
      'Extract clean HTML content from URLs and save to scraped-content/ folder');

    // Check if we should skip scraping
    const existingFiles = await this.scraperService.checkExistingContent();
    let skipScraping = false;

    if (existingFiles > 0) {
      console.log(`📁 Found ${existingFiles} existing HTML files in scraped-content/`);
      skipScraping = await cli.askPermission(
        'Skip HTML scraping and use existing files?', 
        true
      );
    }

    if (!skipScraping) {
      const proceedWithScraping = await cli.askPermission(
        'Start HTML scraping process?', 
        true
      );

      if (!proceedWithScraping) {
        console.log('\n🚫 Process cancelled by user');
        return;
      }

      console.log('\n🚀 Starting HTML scraping...');
      const results = await this.scraperService.scrapeUrls();

      // Track failed URLs for final summary
      if (results.errors && results.errors.length > 0) {
        this.failedUrls = results.errors.map(error => ({
          url: error.context?.url || 'Unknown URL',
          error: error.userMessage || error.message
        }));
      }

      if (results.successful === 0) {
        throw new Error('No HTML files were created. Please check the scraper configuration.');
      }

      cli.displaySuccess(`Step 1 Complete: ${results.successful} HTML files scraped successfully!`);
    } else {
      console.log('\n⏭️  Skipping HTML scraping - using existing files');
    }

    // Brief pause between steps
    await this._pause(2000);
  }

  /**
   * Run the image processing step
   * @private
   * @returns {Promise<void>}
   */
  async _runImageProcessingStep() {
    cli.displayStepHeader(2, 'IMAGE EXTRACTION & DOWNLOAD', 
      'Find all images in HTML files and download with organized naming');

    // Check if we should skip image processing
    const imageConfig = config.get('images');
    const outputDir = config.resolvePath(imageConfig.outputDir);
    let skipImageProcessing = false;

    if (await exists(outputDir)) {
      const imageFiles = await getFiles(outputDir, '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico,.bmp');
      
      if (imageFiles.length > 0) {
        console.log(`📁 Found ${imageFiles.length} existing images in output/images/ folder`);
        skipImageProcessing = await cli.askPermission(
          'Skip image processing and use existing images?', 
          true
        );
      }
    }

    if (!skipImageProcessing) {
      const proceedWithImages = await cli.askPermission(
        'Start image extraction and download process?', 
        true
      );

      if (!proceedWithImages) {
        console.log('\n🚫 Image processing cancelled by user');
        this.bypassImages = true;
        config.update('images', { enabled: false });
        return;
      }

      console.log('\n🖼️  Starting image processing...');
      try {
        const results = await this.imageService.downloadAllImages();

        // Track failed images for final summary
        if (results.errors && results.errors.length > 0) {
          this.failedImages = results.errors.map(error => ({
            url: error.url || 'Unknown URL',
            error: error.message || 'Download failed'
          }));
        }

        if (results.bypassedImages) {
          console.log('\n⏭️  Image processing was bypassed');
          this.bypassImages = true;
        } else if (results.successful === 0 && results.failed > 0) {
          const continueAnyway = await cli.askPermission(
            'No images were downloaded successfully. Continue with content processing?', 
            true
          );
          if (!continueAnyway) {
            throw new Error('Pipeline stopped due to image download failures');
          }
        } else {
          cli.displaySuccess(`Step 2 Complete: ${results.successful} images downloaded successfully!`);
        }
      } catch (error) {
        console.error(`\n❌ Image processing failed: ${error.message}`);
        const continueWithoutImages = await cli.askPermission(
          'Continue without images?', 
          true
        );
        
        if (!continueWithoutImages) {
          throw error;
        }
        
        console.log('\n⏭️  Continuing without image processing');
        this.bypassImages = true;
        config.update('images', { enabled: false });
      }
    } else {
      console.log('\n⏭️  Skipping image processing - using existing images');
    }

    // Prompt for WordPress image upload settings
    await this._getWordPressImageSettings();

    await this._pause(1000);
  }

  /**
   * Get WordPress image upload settings from user
   * @private
   */
  async _getWordPressImageSettings() {
    console.log('\n📸 WORDPRESS IMAGE UPLOAD SETTINGS');
    console.log('When images are uploaded to WordPress, they need to match the expected URL structure.');
    console.log('Format: https://di-uploads-development.dealerinspire.com/{dealer-slug}/uploads/{year}/{month}/{filename}');
    console.log('');

    const processingConfig = config.get('processor');
    
    // Check if we already have settings
    if (processingConfig.dealerSlug && processingConfig.imageYear && processingConfig.imageMonth) {
      console.log('📋 Current WordPress image settings:');
      console.log(`   🏢 Dealer Slug: ${processingConfig.dealerSlug}`);
      console.log(`   📅 Upload Date: ${processingConfig.imageYear}/${processingConfig.imageMonth}`);
      console.log('');
      
      const useExisting = await cli.askPermission(
        'Use existing WordPress image settings?',
        true
      );
      
      if (useExisting) {
        console.log('✅ Using existing WordPress image settings');
        return;
      }
    }

    // Get dealer slug
    const dealerSlug = await cli.askInput(
      '🏢 Enter the dealer slug (e.g., "albanytoyota", "delrayhyundai"):',
      processingConfig.dealerSlug || ''
    );

    if (!dealerSlug.trim()) {
      console.log('⚠️  No dealer slug provided - image URLs will not be updated');
      return;
    }

    // Get current date for defaults
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');

    // Get year
    const imageYear = await cli.askInput(
      `📅 Enter the upload year (default: ${currentYear}):`,
      processingConfig.imageYear || currentYear
    );

    // Get month
    let imageMonth = await cli.askInput(
      `📅 Enter the upload month (01-12, default: ${currentMonth}):`,
      processingConfig.imageMonth || currentMonth
    );

    // Validate month
    const monthNum = parseInt(imageMonth);
    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      console.log('⚠️  Invalid month - using current month');
      imageMonth = currentMonth;
    }

    // Update configuration
    config.update('processor', {
      dealerSlug: dealerSlug.trim(),
      imageYear: imageYear.trim(),
      imageMonth: imageMonth.padStart(2, '0'),
      updateImageUrls: true
    });

    console.log('✅ WordPress image settings saved');
    console.log(`   🌐 Base URL: https://di-uploads-development.dealerinspire.com/${dealerSlug.trim()}/uploads/${imageYear.trim()}/${imageMonth.padStart(2, '0')}/`);
  }

  /**
   * Run the content processing step
   * @private
   * @returns {Promise<void>}
   */
  async _runContentProcessingStep() {
    cli.displayStepHeader(3, 'HTML SANITIZATION', 
      'Remove custom classes, inline styles, and update links for WordPress');

    // Check if clean-content folder already exists
    const processorConfig = config.get('processor');
    const cleanContentDir = config.resolvePath(processorConfig.outputDir);
    let skipProcessing = false;
    
    if (await exists(cleanContentDir)) {
      const htmlFiles = await getFiles(cleanContentDir, '.html');
      
      if (htmlFiles.length > 0) {
        console.log(`📁 Found ${htmlFiles.length} sanitized files in clean-content/ folder`);
        skipProcessing = await cli.askPermission(
          'Skip HTML sanitization and use existing clean-content files?', 
          true
        );
      }
    }

    if (!skipProcessing) {
      const proceedWithProcessing = await cli.askPermission(
        'Start HTML sanitization process?', 
        true
      );

      if (!proceedWithProcessing) {
        console.log('\n🚫 HTML sanitization cancelled by user');
        throw new Error('Pipeline stopped - HTML sanitization required');
      }

      // Ask for custom element selectors to remove/ignore
      const customSelectors = await cli.askForCustomSelectors();

      console.log('\n🧹 Starting HTML sanitization...');
      
      try {
        // Configure processor based on image bypass setting and custom selectors
        const processorOptions = {
          nonInteractive: true,
          customRemoveSelectors: customSelectors.length > 0 ? customSelectors : undefined
        };
        this.processorService = new ContentProcessorService(processorOptions);
        
        const results = await this.processorService.processContent();

        // Track failed files for final summary
        if (results.results) {
          const failedResults = results.results.filter(r => !r.success);
          this.failedFiles = failedResults.map(result => ({
            filename: result.filename,
            error: result.error || 'Processing failed'
          }));
        }

        if (results.successful === 0) {
          throw new Error('No content was sanitized successfully. Please check the processor configuration.');
        }

        cli.displaySuccess(`Step 3 Complete: ${results.successful} files sanitized successfully!`);
        
        // Display processing statistics
        if (results.results && results.results.length > 0) {
          const successfulResults = results.results.filter(r => r.success);
          if (successfulResults.length > 0) {
            const avgReduction = successfulResults
              .reduce((sum, r) => sum + parseFloat(r.reduction), 0) / successfulResults.length;
            console.log(`📉 Average file size reduction: ${avgReduction.toFixed(1)}%`);
          }
        }

      } catch (error) {
        console.error(`\n❌ HTML sanitization failed: ${error.message}`);
        
        const continueToCSV = await cli.askPermission(
          'Continue to CSV generation step anyway?', 
          false
        );

        if (!continueToCSV) {
          throw error;
        }
        
        console.log('\n⚠️  Continuing to CSV generation with potential issues');
      }
    } else {
      console.log('\n⏭️  Skipping HTML sanitization - using existing clean-content files');
    }

    await this._pause(1000);
  }

  /**
   * Run the CSV generation step
   * @private
   * @returns {Promise<void>}
   */
  async _runCSVGenerationStep() {
    cli.displayStepHeader(4, 'WORDPRESS CSV GENERATION', 
      'Generate CSV import file from sanitized content for Really Simple CSV Importer');

    // Check if CSV files already exist
    const csvConfig = config.get('csv');
    const csvOutputDir = config.resolvePath(csvConfig.outputDir);
    let skipCSVGeneration = false;

    if (await exists(csvOutputDir)) {
      const csvFiles = await getFiles(csvOutputDir, '.csv');
      
      if (csvFiles.length > 0) {
        console.log(`📁 Found ${csvFiles.length} existing CSV files in wp-ready/ folder`);
        skipCSVGeneration = await cli.askPermission(
          'Skip CSV generation and use existing files?', 
          true
        );
      }
    }

    if (!skipCSVGeneration) {
      const proceedWithCSV = await cli.askPermission(
        'Generate WordPress CSV import file?', 
        true
      );

      if (!proceedWithCSV) {
        console.log('\n⏸️  CSV generation skipped');
        cli.displayInfo('To generate CSV later', [
          '• Run: npm run csv',
          '• Or run full automation again: npm start'
        ]);
        return;
      }

      console.log('\n📝 Starting CSV generation...');
      
      try {
        const results = await this.csvService.generateCSV();

        if (results.generatedFiles === 0) {
          throw new Error('No CSV files were generated. Please check the CSV generator configuration.');
        }

        cli.displaySuccess(`Step 4 Complete: ${results.generatedFiles} CSV file(s) generated successfully!`);
        
        console.log('📊 Generated content summary:');
        console.log(`   📝 Posts: ${results.posts}`);
        console.log(`   📄 Pages: ${results.pages}`);
        console.log(`   📦 Total items: ${results.processedItems}`);
        console.log(`   📏 File size: ${results.fileSizeFormatted}`);

      } catch (error) {
        console.error(`\n❌ CSV generation failed: ${error.message}`);
        
        const continueAnyway = await cli.askPermission(
          'Continue to final summary anyway?', 
          true
        );

        if (!continueAnyway) {
          throw error;
        }
        
        console.log('\n⚠️  Continuing to completion with CSV generation issues');
      }
    } else {
      console.log('\n⏭️  Skipping CSV generation - using existing files');
    }

    await this._pause(1000);
  }

  /**
   * Display final summary
   * @private
   * @returns {Promise<void>}
   */
  async _displayFinalSummary() {
    const hasFailures = this.failedUrls.length > 0 || this.failedFiles.length > 0 || this.failedImages.length > 0;
    
    cli.displayStepHeader('✅', 'AUTOMATION COMPLETE!', 
      hasFailures ? 'Pipeline completed with some failures' : 'All steps completed successfully');

    const results = {
      'HTML files scraped': await this._getScrapedFileCount(),
      'HTML files sanitized': await this._getCleanFileCount(),
      'Images': this.bypassImages ? 'Bypassed by user' : await this._getImageCount(),
      'CSV import files': await this._getCSVFileCount()
    };

    cli.displayResultsSummary(results);
    
    // Display failed items if any
    this._displayFailures();
    
    console.log('\n📁 Your organized content structure:');
    console.log('   • output/scraped-content/ - Original scraped HTML');
    console.log('   • output/clean-content/ - Sanitized HTML (classes/styles removed)');
    if (!this.bypassImages) {
      console.log('   • output/images/ - Downloaded images with organized names');
    }
    console.log('   • output/wp-ready/ - WordPress CSV import file(s)');
    console.log('   • data/ - Configuration and mapping files');

    if (!this.bypassImages) {
      cli.displayNextSteps([
        '🌐 Go to WordPress Admin → Tools → Import',
        '📁 Choose "CSV Importer" (Really Simple CSV Importer plugin)',
        '📄 Upload the generated wordpress-import.csv file',
        '⚙️  Map CSV columns to WordPress fields as needed',
        '🚀 Run the import to create your posts and pages!'
      ]);
    } else {
      cli.displayNextSteps([
        '🌐 Go to WordPress Admin → Tools → Import', 
        '📁 Choose "CSV Importer" (Really Simple CSV Importer plugin)',
        '📄 Upload the generated wordpress-import.csv file',
        '⚙️  Map CSV columns to WordPress fields as needed',
        '🚀 Run the import to create your posts and pages!',
        '',
        '⚠️  Note: Images were bypassed - you may need to add images manually'
      ]);
    }
    
    // Display any important notes
    const csvFileCount = await this._getCSVFileCount();
    if (csvFileCount > 1) {
      console.log('\n📋 IMPORTANT: Multiple CSV files were created.');
      console.log('   Import them one at a time in WordPress.');
    }
  }

  /**
   * Get count of scraped files
   * @private
   * @returns {Promise<number>}
   */
  async _getScrapedFileCount() {
    try {
      return await this.scraperService.checkExistingContent();
    } catch {
      return 0;
    }
  }

  /**
   * Get count of clean/sanitized files
   * @private
   * @returns {Promise<number>}
   */
  async _getCleanFileCount() {
    try {
      const processorConfig = config.get('processor');
      const cleanDir = config.resolvePath(processorConfig.outputDir); // output/clean-content
      const files = await getFiles(cleanDir, '.html');
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get count of processed files
   * @private
   * @returns {Promise<number>}
   */
  async _getProcessedFileCount() {
    try {
      const processorConfig = config.get('processor');
      const wpReadyDir = config.resolvePath(processorConfig.outputDir);
      const files = await getFiles(wpReadyDir, '.html');
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get count of image files
   * @private
   * @returns {Promise<number>}
   */
  async _getImageCount() {
    try {
      const imageConfig = config.get('images');
      const imageDir = config.resolvePath(imageConfig.outputDir);
      const files = await getFiles(imageDir, '.jpg,.jpeg,.png,.gif,.webp,.svg,.ico,.bmp');
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get count of CSV files
   * @private
   * @returns {Promise<number>}
   */
  async _getCSVFileCount() {
    try {
      const csvConfig = config.get('csv');
      const csvDir = config.resolvePath(csvConfig.outputDir);
      const files = await getFiles(csvDir, '.csv');
      return files.length;
    } catch {
      return 0;
    }
  }

  /**
   * Display failed URLs and files from the pipeline
   * @private
   */
  _displayFailures() {
    const hasFailures = this.failedUrls.length > 0 || this.failedFiles.length > 0 || this.failedImages.length > 0;
    
    if (!hasFailures) {
      return;
    }

    console.log('\n⚠️  FAILED ITEMS SUMMARY');
    console.log('='.repeat(60));

    if (this.failedUrls.length > 0) {
      console.log(`\n❌ Failed URLs (${this.failedUrls.length}):`);
      console.log('─'.repeat(40));
      this.failedUrls.forEach((failed, index) => {
        console.log(`${index + 1}. ${failed.url}`);
        console.log(`   Error: ${failed.error}`);
        if (index < this.failedUrls.length - 1) console.log('');
      });
    }

    if (this.failedFiles.length > 0) {
      console.log(`\n❌ Failed Files (${this.failedFiles.length}):`);
      console.log('─'.repeat(40));
      this.failedFiles.forEach((failed, index) => {
        console.log(`${index + 1}. ${failed.filename}`);
        console.log(`   Error: ${failed.error}`);
        if (index < this.failedFiles.length - 1) console.log('');
      });
    }

    if (this.failedImages.length > 0) {
      console.log(`\n❌ Failed Images (${this.failedImages.length}):`);
      console.log('─'.repeat(40));
      this.failedImages.forEach((failed, index) => {
        console.log(`${index + 1}. ${failed.url || failed.filename}`);
        console.log(`   Error: ${failed.error}`);
        if (index < this.failedImages.length - 1) console.log('');
      });
    }

    console.log('\n💡 Recommendations:');
    console.log('   • Check failed URLs for availability and correct formatting');
    console.log('   • Verify network connection and site accessibility');
    console.log('   • Review error messages for specific issues');
    console.log('   • Re-run the pipeline to retry failed items');
  }

  /**
   * Pause execution for specified milliseconds
   * @private
   * @param {number} ms - Milliseconds to pause
   * @returns {Promise<void>}
   */
  async _pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main entry point
 */
async function main() {
  const pipeline = new ContentAutomationPipeline();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await pipeline.scraperService.cleanup();
    cli.cleanup();
    process.exit(0);
  });

  await pipeline.run();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorInfo = handleError(error);
    console.error('\n💥 Pipeline Error:', errorInfo.userMessage);
    process.exit(1);
  });
}
