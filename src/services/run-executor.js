/**
 * @fileoverview Service to execute automation runs with provided configuration
 * @author Content Automation Team
 */

import { HTMLScraperService } from '../core/scraper.js';
import { ImageDownloaderService } from '../core/image-downloader.js';
import { ContentProcessorService } from '../core/processor.js';
import { CSVGeneratorService } from '../core/csv-generator.js';
import config from '../config/index.js';
import { handleError } from '../utils/errors.js';
import { prisma } from '../lib/db/client.js';
import { writeFile } from '../utils/filesystem.js';
import { cleanupOutputDirectories } from '../utils/cleanup-output.js';
import { ensureContentMigrationFolders, copyToContentMigration, extractDealerSlug } from '../utils/content-migration-path.js';
import fs from 'fs-extra';

/**
 * Execute automation run with provided configuration
 * @param {Object} runConfig - Configuration for the run
 * @param {string} runConfig.runId - Database run ID
 * @param {string[]} runConfig.urls - URLs to scrape
 * @param {Object} runConfig.siteProfile - Site profile configuration
 * @returns {Promise<Object>} Run results
 */
export class RunExecutor {
  constructor(runId) {
    this.runId = runId;
    this.scraperService = null;
    this.imageService = null;
    this.processorService = null;
    this.csvService = null;
  }

  /**
   * Update run status in database
   * @private
   */
  async _updateRunStatus(status, updates = {}) {
    await prisma.run.update({
      where: { id: this.runId },
      data: { status, ...updates },
    });
  }

  /**
   * Log message to database
   * @private
   */
  async _log(level, service, message, context = {}) {
    try {
      await prisma.logEntry.create({
        data: {
          runId: this.runId,
          level,
          service,
          message,
          context,
        },
      });
    } catch (error) {
      // Don't fail the run if logging fails
      console.error('Failed to log to database:', error);
    }
  }

  /**
   * Update run with progress information
   * @private
   */
  async _updateProgress(step, progress) {
    try {
      const currentRun = await prisma.run.findUnique({ where: { id: this.runId } });
      if (!currentRun) {
        console.error('Run not found for progress update:', this.runId);
        return;
      }

      await prisma.run.update({
        where: { id: this.runId },
        data: {
          configSnapshot: {
            // Preserve existing config
            ...(currentRun.configSnapshot || {}),
            // Add progress info
            currentStep: step,
            progress: progress,
          },
        },
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }

  /**
   * Execute the automation pipeline
   * @param {Object} options - Run configuration options
   */
  async execute(options) {
    const {
      urls,
      siteProfile,
      contentType = 'post',
      bypassImages = false,
      blogPostSelectors = null,
      customRemoveSelectors = [],
      wordPressSettings = {},
      skipScraping = false,
      skipImageProcessing = false,
      skipContentProcessing = false,
      skipCSVGeneration = false,
    } = options;

    try {
      // Merge site profile config with direct options (direct options take precedence)
      const profileConfig = siteProfile?.config || {};
      
      // Build blog post selectors from profile or direct options
      const finalBlogPostSelectors = blogPostSelectors || (profileConfig.blogPost ? {
        contentSelector: profileConfig.blogPost.contentSelector,
        dateSelector: profileConfig.blogPost.dateSelector,
        titleSelector: profileConfig.blogPost.titleSelector,
      } : null);
      
      // Merge custom remove selectors (profile + direct)
      const profileRemoveSelectors = profileConfig.processor?.customRemoveSelectors || [];
      const profileBlogExclude = profileConfig.blogPost?.excludeSelectors || [];
      const profilePageExclude = profileConfig.page?.excludeSelectors || [];
      const allRemoveSelectors = [
        ...profileRemoveSelectors,
        ...customRemoveSelectors,
        ...(contentType === 'post' ? profileBlogExclude : profilePageExclude),
      ];
      
      // Determine final image bypass setting (direct option overrides profile)
      const finalBypassImages = bypassImages || (profileConfig.images?.enabled === false);
      
      // Get type-specific content selector (blogPost.contentSelector or page.contentSelector)
      const typeSpecificContentSelector = contentType === 'post' 
        ? (profileConfig.blogPost?.contentSelector || finalBlogPostSelectors?.contentSelector)
        : (profileConfig.page?.contentSelector);
      
      // Initialize services with merged config
      this.scraperService = new HTMLScraperService({
        contentType,
        contentSelector: typeSpecificContentSelector || null,
      });
      this.imageService = new ImageDownloaderService();
      
      // Configure processor with merged options
      const processorOptions = {
        nonInteractive: true,
        customRemoveSelectors: allRemoveSelectors.length > 0 ? allRemoveSelectors : undefined,
        contentType,
        blogPostSelectors: finalBlogPostSelectors,
        ...wordPressSettings,
        // Merge processor config from profile
        ...(profileConfig.processor || {}),
      };
      this.processorService = new ContentProcessorService(processorOptions);
      
      this.csvService = new CSVGeneratorService({ 
        contentType, 
        blogPostSelectors: finalBlogPostSelectors,
      });

      // Update config with merged settings
      // Image config: direct bypassImages overrides profile
      const imageConfig = {
        enabled: !finalBypassImages,
        ...(profileConfig.images || {}),
      };
      // Direct bypassImages setting overrides profile enabled setting
      if (bypassImages !== undefined) {
        imageConfig.enabled = !bypassImages;
      }
      config.update('images', imageConfig);
      
      // Processor config
      const processorConfigUpdate = {
        nonInteractive: true,
        ...processorOptions,
      };
      config.update('processor', processorConfigUpdate);
      
      // CSV config
      config.update('csv', { 
        contentType, 
        blogPostSelectors: finalBlogPostSelectors,
      });
      
      // Scraper config: merge profile scraper config
      // Note: contentSelectors from profile will be used as fallback after type-specific selector
      if (profileConfig.scraper) {
        const currentScraperConfig = config.get('scraper');
        config.update('scraper', { ...currentScraperConfig, ...profileConfig.scraper });
        // Also update the scraper service config directly
        Object.assign(this.scraperService.config, profileConfig.scraper);
      }

      // Clean output directories before starting
      await this._log('info', 'executor', 'Cleaning output directories', {});
      try {
        const cleanupResults = await cleanupOutputDirectories({ keepImages: bypassImages });
        await this._log('info', 'executor', `Cleaned ${cleanupResults.cleaned.length} directories`, {
          cleaned: cleanupResults.cleaned,
        });
      } catch (error) {
        await this._log('warn', 'executor', 'Cleanup warning', { error: error.message });
      }

      await this._updateRunStatus('running', { startedAt: new Date() });
      await this._log('info', 'executor', 'Run started', { urlsCount: urls.length });

      // Determine dealer slug for Content-Migration folder organization
      let dealerSlug = siteProfile?.dealerSlug;
      if (!dealerSlug && urls.length > 0) {
        try {
          dealerSlug = extractDealerSlug(urls[0]);
          await this._log('info', 'executor', `Auto-detected dealer: ${dealerSlug}`, { url: urls[0] });
        } catch (error) {
          await this._log('warn', 'executor', `Failed to auto-detect dealer slug: ${error.message}`);
          dealerSlug = 'unknown-dealer';
        }
      }

      let results = {
        urlsScraped: 0,
        urlsFailed: 0,
        imagesDownloaded: 0,
        imagesFailed: 0,
        filesProcessed: 0,
        filesFailed: 0,
        postsDetected: 0,
        pagesDetected: 0,
        csvFilesGenerated: 0,
      };

      // Step 1: HTML Scraping
      if (!skipScraping) {
        await this._updateProgress('Scraping HTML content', {});
        await this._log('info', 'scraper', 'Starting HTML scraping');
        
        // Write URLs to file for scraper service to read (scraper can also accept urls directly)
        const urlsFile = config.resolvePath('data/urls.txt');
        const urlsText = urls.join('\n');
        await writeFile(urlsFile, urlsText);
        
        // Scrape URLs (scraper service handles browser initialization and cleanup internally)
        const scrapeResults = await this.scraperService.scrapeUrls(urls);
        results.urlsScraped = scrapeResults.successful || 0;
        results.urlsFailed = scrapeResults.errors?.length || 0;
        await this._updateProgress('HTML scraping complete', { urlsScraped: results.urlsScraped, urlsFailed: results.urlsFailed });
        await this._log('info', 'scraper', `Scraping complete: ${results.urlsScraped} successful, ${results.urlsFailed} failed`);
      }

      // Step 2: Image Processing
      let imagesMigrationPath = null;
      if (!bypassImages && !skipImageProcessing) {
        await this._updateProgress('Downloading images', { urlsScraped: results.urlsScraped });
        await this._log('info', 'image-downloader', 'Starting image processing');
        const imageResults = await this.imageService.downloadAllImages();
        results.imagesDownloaded = imageResults.successful || 0;
        results.imagesFailed = imageResults.errors?.length || 0;
        
        // Copy images to Content-Migration folder (dealer-based organization)
        try {
          const migrationPaths = await ensureContentMigrationFolders(dealerSlug);
          const imagesSourcePath = config.resolvePath('output/images');
          
          if (await fs.pathExists(imagesSourcePath)) {
            await copyToContentMigration(imagesSourcePath, migrationPaths.images, true);
            imagesMigrationPath = migrationPaths.images;
            await this._log('info', 'image-downloader', `Images copied to Content-Migration: ${migrationPaths.images}`);
          }
        } catch (error) {
          await this._log('warn', 'image-downloader', `Failed to copy images to Content-Migration: ${error.message}`);
        }
        
        await this._updateProgress('Image processing complete', { urlsScraped: results.urlsScraped, imagesDownloaded: results.imagesDownloaded, imagesFailed: results.imagesFailed });
        await this._log('info', 'image-downloader', `Image processing complete: ${results.imagesDownloaded} downloaded, ${results.imagesFailed} failed`);
      } else if (bypassImages) {
        await this._log('info', 'image-downloader', 'Image processing bypassed');
      }

      // Step 3: Content Processing
      if (!skipContentProcessing) {
        await this._updateProgress('Processing and sanitizing content', { 
          urlsScraped: results.urlsScraped, 
          imagesDownloaded: results.imagesDownloaded 
        });
        await this._log('info', 'processor', 'Starting content processing');
        const processResults = await this.processorService.processContent();
        results.filesProcessed = processResults.successful || 0;
        results.filesFailed = processResults.results?.filter(r => !r.success).length || 0;
        await this._updateProgress('Content processing complete', { 
          urlsScraped: results.urlsScraped, 
          imagesDownloaded: results.imagesDownloaded,
          filesProcessed: results.filesProcessed,
          filesFailed: results.filesFailed
        });
        await this._log('info', 'processor', `Content processing complete: ${results.filesProcessed} processed, ${results.filesFailed} failed`);
      }

      // Step 4: CSV Generation
      let csvMigrationPath = null;
      if (!skipCSVGeneration) {
        await this._updateProgress('Generating WordPress CSV', { 
          urlsScraped: results.urlsScraped, 
          imagesDownloaded: results.imagesDownloaded,
          filesProcessed: results.filesProcessed
        });
        await this._log('info', 'csv-generator', 'Starting CSV generation');
        const csvResults = await this.csvService.generateCSV();
        results.csvFilesGenerated = csvResults.generatedFiles || 0;
        results.postsDetected = csvResults.posts || 0;
        results.pagesDetected = csvResults.pages || 0;
        
        // Copy CSV to Content-Migration folder (dealer-based organization)
        try {
          const migrationPaths = await ensureContentMigrationFolders(dealerSlug);
          const csvSourcePath = config.resolvePath('output/wp-ready/wordpress-import.csv');
          
          if (await fs.pathExists(csvSourcePath)) {
            await copyToContentMigration(csvSourcePath, migrationPaths.csvFile);
            csvMigrationPath = migrationPaths.csvFile;
            await this._log('info', 'csv-generator', `CSV copied to Content-Migration: ${migrationPaths.csvFile}`);
          }
        } catch (error) {
          await this._log('warn', 'csv-generator', `Failed to copy CSV to Content-Migration: ${error.message}`);
        }
        
        await this._updateProgress('CSV generation complete', { 
          urlsScraped: results.urlsScraped, 
          imagesDownloaded: results.imagesDownloaded,
          filesProcessed: results.filesProcessed,
          postsDetected: results.postsDetected,
          pagesDetected: results.pagesDetected
        });
        await this._log('info', 'csv-generator', `CSV generation complete: ${results.csvFilesGenerated} files, ${results.postsDetected} posts, ${results.pagesDetected} pages`);
      }

      // Calculate metrics
      const runRecord = await prisma.run.findUnique({ where: { id: this.runId } });
      if (!runRecord || !runRecord.startedAt) {
        throw new Error('Run record not found or missing startedAt timestamp');
      }
      const totalDuration = Date.now() - new Date(runRecord.startedAt).getTime();
      const pagesProcessed = results.postsDetected + results.pagesDetected;
      const timeSavedMinutes = pagesProcessed * 15; // 15 minutes per page
      const timeSavedHours = (timeSavedMinutes / 60).toFixed(2);

      // Update config snapshot with Content-Migration paths
      const currentRun = await prisma.run.findUnique({ where: { id: this.runId } });
      if (currentRun?.configSnapshot) {
        const updatedSnapshot = {
          ...currentRun.configSnapshot,
        };
        
        // Add dealer slug and Content-Migration paths
        if (dealerSlug) {
          updatedSnapshot.dealerSlug = dealerSlug;
          
          // Calculate base path for display
          const migrationPaths = await ensureContentMigrationFolders(dealerSlug);
          updatedSnapshot.contentMigrationBasePath = migrationPaths.dealerBase;
        }
        
        // Add Content-Migration paths if they were set
        if (imagesMigrationPath) {
          updatedSnapshot.contentMigrationImagesPath = imagesMigrationPath;
        }
        if (csvMigrationPath) {
          updatedSnapshot.contentMigrationCsvPath = csvMigrationPath;
        }
        
        await prisma.run.update({
          where: { id: this.runId },
          data: {
            configSnapshot: updatedSnapshot,
          },
        });
      }

      // Save metrics
      await prisma.runMetrics.create({
        data: {
          runId: this.runId,
          urlsScraped: results.urlsScraped,
          urlsFailed: results.urlsFailed,
          imagesDownloaded: results.imagesDownloaded,
          imagesFailed: results.imagesFailed,
          filesProcessed: results.filesProcessed,
          filesFailed: results.filesFailed,
          postsDetected: results.postsDetected,
          pagesDetected: results.pagesDetected,
          totalDurationMs: totalDuration,
          errorCount: results.urlsFailed + results.imagesFailed + results.filesFailed,
        },
      });

      await this._updateRunStatus('completed', { 
        completedAt: new Date(),
      });

      await this._log('info', 'executor', 'Run completed successfully', {
        timeSavedMinutes,
        pagesProcessed,
      });

      return {
        success: true,
        results,
        metrics: {
          timeSavedMinutes,
          timeSavedHours,
          pagesProcessed,
          totalDuration,
        },
      };
    } catch (error) {
      const errorInfo = handleError(error, { runId: this.runId });
      await this._log('error', 'executor', errorInfo.userMessage, { error: error.message });
      await this._updateRunStatus('failed');
      throw error;
    }
  }
}
