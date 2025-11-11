/**
 * @fileoverview Cleanup Script for Content Automation System
 * @author Ryan Vandehey
 * @version 2.0.0
 * 
 * Safely removes all generated content files, configuration data, and logs
 */

import fs from 'fs-extra';
import path from 'path';
import { cli } from '../utils/cli.js';
import config from '../config/index.js';

// Runtime-generated folders to clean
const FOLDERS_TO_CLEAN = [
  'output/scraped-content',
  'output/clean-content',
  'output/images', 
  'output/wp-ready',
  'logs'
];

// Runtime-generated individual files to clean
const FILES_TO_CLEAN = [
  'data/content-type-mappings.json',
  'data/url-mappings.json',
  'data/custom-selectors.json'
];

/**
 * Get comprehensive stats for files and folders
 * @param {string} targetPath - Path to analyze
 * @returns {Promise<Object>} Statistics object
 */
async function getPathStats(targetPath) {
  try {
    const resolvedPath = config.resolvePath(targetPath);
    
    if (!await fs.pathExists(resolvedPath)) {
      return { exists: false, files: 0, size: 0, type: 'none' };
    }

    const stats = await fs.stat(resolvedPath);
    
    if (stats.isFile()) {
      return {
        exists: true,
        files: 1,
        size: stats.size,
        type: 'file'
      };
    }
    
    if (stats.isDirectory()) {
      const files = await fs.readdir(resolvedPath);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        const filePath = path.join(resolvedPath, file);
        const fileStats = await fs.stat(filePath);
        
        if (fileStats.isFile()) {
          totalSize += fileStats.size;
          fileCount++;
        } else if (fileStats.isDirectory()) {
          // Recursively count subdirectories
          const subStats = await getPathStats(path.relative(process.cwd(), filePath));
          totalSize += subStats.size;
          fileCount += subStats.files;
        }
      }

      return {
        exists: true,
        files: fileCount,
        size: totalSize,
        type: 'directory'
      };
    }
    
    return { exists: false, files: 0, size: 0, type: 'unknown' };
  } catch (error) {
    return { exists: false, files: 0, size: 0, type: 'error', error: error.message };
  }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Clean up a specific path (file or folder)
 * @param {string} targetPath - Path to clean
 * @param {string} type - Type of path (file/directory)
 * @returns {Promise<boolean>} Success status
 */
async function cleanupPath(targetPath, type) {
  try {
    const resolvedPath = config.resolvePath(targetPath);
    
    if (await fs.pathExists(resolvedPath)) {
      const icon = type === 'file' ? '📄' : '📁';
      console.log(`   🗑️  Removing ${icon} ${targetPath}`);
      await fs.remove(resolvedPath);
      console.log(`   ✅ Deleted ${icon} ${targetPath}`);
      return true;
    } else {
      const icon = type === 'file' ? '📄' : '📁';
      console.log(`   ⏭️  ${icon} ${targetPath} doesn't exist, skipping`);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Failed to delete ${targetPath}: ${error.message}`);
    return false;
  }
}

/**
 * Display cleanup preview
 * @param {Array} allPaths - All paths to be cleaned
 * @returns {Promise<Object>} Summary statistics
 */
async function displayCleanupPreview(allPaths) {
  console.log('🧹 CONTENT AUTOMATION CLEANUP UTILITY');
  console.log('='.repeat(80));
  console.log('This will permanently delete all runtime-generated files and folders:');
  console.log('');

  const pathStats = [];
  let totalFiles = 0;
  let totalSize = 0;
  let itemsFound = 0;

  // Analyze folders
  console.log('📁 FOLDERS:');
  for (const folder of FOLDERS_TO_CLEAN) {
    const stats = await getPathStats(folder);
    pathStats.push({ path: folder, ...stats });
    
    if (stats.exists) {
      itemsFound++;
      totalFiles += stats.files;
      totalSize += stats.size;
      
      if (stats.files > 0) {
        console.log(`   📁 ${folder} - ${stats.files} files (${formatSize(stats.size)})`);
      } else {
        console.log(`   📁 ${folder} - Empty folder`);
      }
    } else {
      console.log(`   📁 ${folder} - Not found`);
    }
  }

  // Analyze individual files
  console.log('\n📄 CONFIGURATION FILES:');
  for (const file of FILES_TO_CLEAN) {
    const stats = await getPathStats(file);
    pathStats.push({ path: file, ...stats });
    
    if (stats.exists) {
      itemsFound++;
      totalFiles += stats.files;
      totalSize += stats.size;
      console.log(`   📄 ${file} - ${formatSize(stats.size)}`);
    } else {
      console.log(`   📄 ${file} - Not found`);
    }
  }

  console.log('');
  console.log(`📊 CLEANUP SUMMARY:`);
  console.log(`   🎯 Items found: ${itemsFound}/${allPaths.length}`);
  console.log(`   📄 Total files: ${totalFiles}`);
  console.log(`   💾 Total size: ${formatSize(totalSize)}`);
  console.log('');

  return {
    pathStats,
    itemsFound,
    totalFiles,
    totalSize
  };
}

/**
 * Main cleanup function
 */
async function cleanup() {
  try {
    const allPaths = [...FOLDERS_TO_CLEAN, ...FILES_TO_CLEAN];
    
    // Display what will be cleaned
    const summary = await displayCleanupPreview(allPaths);
    
    if (summary.itemsFound === 0) {
      console.log('✅ Nothing to clean up - workspace is already clean!');
      console.log('🎉 Ready for content automation');
      return;
    }

    // Show detailed breakdown of what will be deleted
    console.log('🔍 DETAILED BREAKDOWN:');
    console.log('   • Scraped HTML files and metadata');
    console.log('   • Downloaded images and mapping files');
    console.log('   • WordPress-ready processed content');
    console.log('   • Generated XML import files');
    console.log('   • Runtime configuration files');
    console.log('   • Application logs');
    console.log('');

    // Ask for confirmation
    const confirmed = await cli.askPermission(
      `Delete ${summary.itemsFound} items containing ${summary.totalFiles} files (${formatSize(summary.totalSize)})?`,
      false
    );

    if (!confirmed) {
      console.log('\n🚫 Cleanup cancelled by user');
      console.log('💡 Your files are safe and unchanged');
      return;
    }

    // Perform cleanup
    console.log('\n🚀 Starting cleanup...');
    let deletedItems = 0;
    let failedItems = 0;

    // Clean folders first
    for (const folder of FOLDERS_TO_CLEAN) {
      const stats = summary.pathStats.find(s => s.path === folder);
      if (stats && stats.exists) {
        const success = await cleanupPath(folder, 'directory');
        if (success) {
          deletedItems++;
        } else {
          failedItems++;
        }
      }
    }

    // Clean individual files
    for (const file of FILES_TO_CLEAN) {
      const stats = summary.pathStats.find(s => s.path === file);
      if (stats && stats.exists) {
        const success = await cleanupPath(file, 'file');
        if (success) {
          deletedItems++;
        } else {
          failedItems++;
        }
      }
    }

    // Final summary
    console.log('\n✅ CLEANUP COMPLETE!');
    console.log('='.repeat(80));
    console.log(`🗑️  Deleted items: ${deletedItems}`);
    if (failedItems > 0) {
      console.log(`❌ Failed deletions: ${failedItems}`);
    }
    console.log(`💾 Space freed: ${formatSize(summary.totalSize)}`);
    
    console.log('\n📋 Cleanup Results:');
    console.log('   ✅ Output folders cleared');
    console.log('   ✅ Runtime configuration removed');
    console.log('   ✅ Application logs cleared');
    
    if (failedItems === 0) {
      console.log('\n🎉 Workspace completely cleaned!');
      console.log('💡 Ready for a fresh content automation run');
    } else {
      console.log('\n⚠️  Some items could not be deleted');
      console.log('💡 Check file permissions or if files are in use');
    }

  } catch (error) {
    console.error('\n💥 Cleanup failed:', error.message);
    console.error('Please check the error and try again');
    throw error;
  } finally {
    cli.cleanup();
  }
}

// Export for use in other scripts
export { cleanup };

/**
 * Quick clean function for specific categories
 * @param {string} category - Category to clean (output, data, logs, all)
 */
export async function quickClean(category = 'all') {
  const categories = {
    output: ['output/scraped-content', 'output/images', 'output/wp-ready', 'output/wp-import'],
    data: ['data/content-type-mappings.json', 'data/url-mappings.json', 'data/custom-selectors.json'],
    logs: ['logs'],
    all: [...FOLDERS_TO_CLEAN, ...FILES_TO_CLEAN]
  };
  
  const pathsToClean = categories[category] || categories.all;
  
  console.log(`🧹 Quick cleaning: ${category.toUpperCase()}`);
  console.log('='.repeat(40));
  
  let cleanedItems = 0;
  for (const targetPath of pathsToClean) {
    const resolvedPath = config.resolvePath(targetPath);
    if (await fs.pathExists(resolvedPath)) {
      const stats = await fs.stat(resolvedPath);
      const type = stats.isFile() ? 'file' : 'directory';
      await cleanupPath(targetPath, type);
      cleanedItems++;
    }
  }
  
  console.log(`✅ Quick clean complete: ${cleanedItems} items removed`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'quick' && args[1]) {
    // Quick clean specific category: node cleanup.js quick output
    quickClean(args[1]).catch(error => {
      console.error('❌ Quick cleanup failed:', error);
      process.exit(1);
    });
  } else if (command === 'quick') {
    // Quick clean all: node cleanup.js quick
    quickClean('all').catch(error => {
      console.error('❌ Quick cleanup failed:', error);
      process.exit(1);
    });
  } else {
    // Full interactive cleanup
    cleanup().catch(error => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
  }
}


