#!/usr/bin/env node
/**
 * @fileoverview CLI for running CSV generator independently
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import { CSVGeneratorService } from '../core/csv-generator.js';
import { handleError } from '../utils/errors.js';

/**
 * Main function to run CSV generator
 */
async function main() {
  try {
    console.log('📝 CSV GENERATOR');
    console.log('='.repeat(60));
    console.log('');
    
    // Initialize CSV service
    const csvService = new CSVGeneratorService();
    
    // Generate CSV
    const results = await csvService.generateCSV();
    
    console.log('\n✅ CSV generation complete!');
    console.log(`📊 Generated ${results.generatedFiles} file(s)`);
    console.log(`   📝 Posts: ${results.posts}`);
    console.log(`   📄 Pages: ${results.pages}`);
    
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

