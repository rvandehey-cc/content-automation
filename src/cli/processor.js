#!/usr/bin/env node
/**
 * @fileoverview CLI for running content processor independently
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { ContentProcessorService } from '../core/processor.js';
import { handleError } from '../utils/errors.js';

/**
 * Main function to run content processor
 */
async function main() {
  try {
    console.log('🧹 CONTENT PROCESSOR');
    console.log('='.repeat(60));
    console.log('');
    
    // Initialize processor service
    const processor = new ContentProcessorService();
    
    // Run processing
    const results = await processor.processContent();
    
    console.log('\n✅ Processing complete!');
    console.log(`📊 Processed ${results.successful} files successfully`);
    
    if (results.failed > 0) {
      console.log(`⚠️  ${results.failed} files had errors`);
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
