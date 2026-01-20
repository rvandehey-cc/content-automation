#!/usr/bin/env node
/**
 * @fileoverview CLI for running image downloader independently
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { ImageDownloaderService } from '../core/image-downloader.js';
import { handleError } from '../utils/errors.js';

/**
 * Main function to run image downloader
 */
async function main() {
  try {
    console.log('🖼️  IMAGE DOWNLOADER');
    console.log('='.repeat(60));
    console.log('');
    
    // Initialize image service
    const imageService = new ImageDownloaderService();
    
    // Download images
    const results = await imageService.downloadAllImages();
    
    console.log('\n✅ Image download complete!');
    console.log(`📊 Downloaded ${results.successful} image(s) successfully`);
    
    if (results.failed > 0) {
      console.log(`⚠️  ${results.failed} image(s) had errors`);
    }
    
    process.exit(0);
    
  } catch (error) {
    const errorInfo = handleError(error);
    console.error(`\n❌ ERROR: ${errorInfo.userMessage}`);
    console.error(`💡 ${errorInfo.suggestion}`);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('\n📋 Technical details:', errorInfo.technicalDetails);
    }
    
    process.exit(1);
  }
}

// Run main function
main();


