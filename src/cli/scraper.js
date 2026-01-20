#!/usr/bin/env node
/**
 * @fileoverview CLI for running HTML scraper independently
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { HTMLScraperService } from '../core/scraper.js';
import { handleError } from '../utils/errors.js';

/**
 * Main function to run HTML scraper
 */
async function main() {
  try {
    console.log('🌐 HTML SCRAPER');
    console.log('='.repeat(60));
    console.log('');
    
    // Initialize scraper service
    const scraperService = new HTMLScraperService();
    
    // Run scraping
    const results = await scraperService.scrapeUrls();
    
    console.log('\n✅ Scraping complete!');
    console.log(`📊 Scraped ${results.successful} URL(s) successfully`);
    
    if (results.failed > 0) {
      console.log(`⚠️  ${results.failed} URL(s) had errors`);
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


