/**
 * @fileoverview Utility to clean output directories before starting a new run
 * @author Content Automation Team
 */

import fs from 'fs-extra';
import path from 'path';
import config from '../config/index.js';

/**
 * Clean output directories before starting a new run
 * @param {Object} options - Cleanup options
 * @param {boolean} options.keepImages - Keep images directory (optional)
 * @returns {Promise<Object>} Cleanup results
 */
export async function cleanupOutputDirectories(options = {}) {
  const { keepImages = false } = options;
  const results = {
    cleaned: [],
    errors: [],
  };

  try {
    const outputDir = config.resolvePath('output');
    const directories = [
      'scraped-content',
      'clean-content',
      'wp-ready',
    ];

    // Clean directories
    for (const dir of directories) {
      const dirPath = path.join(outputDir, dir);
      try {
        if (await fs.pathExists(dirPath)) {
          await fs.emptyDir(dirPath);
          results.cleaned.push(dir);
        }
      } catch (error) {
        results.errors.push({ directory: dir, error: error.message });
      }
    }

    // Conditionally clean images
    if (!keepImages) {
      const imagesDir = path.join(outputDir, 'images');
      try {
        if (await fs.pathExists(imagesDir)) {
          await fs.emptyDir(imagesDir);
          results.cleaned.push('images');
        }
      } catch (error) {
        results.errors.push({ directory: 'images', error: error.message });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to cleanup output directories: ${error.message}`);
  }
}

