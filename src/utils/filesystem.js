/**
 * @fileoverview Common file system utilities
 * @author Ryan Vandehey
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Ensure directory exists, create if it doesn't
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
export async function ensureDir(dirPath) {
  await fs.ensureDir(dirPath);
}

/**
 * Check if file or directory exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} True if exists
 */
export async function exists(filePath) {
  return await fs.pathExists(filePath);
}

/**
 * Read JSON file safely
 * @param {string} filePath - Path to JSON file
 * @param {Object} defaultValue - Default value if file doesn't exist
 * @returns {Promise<Object>} Parsed JSON or default value
 */
export async function readJSON(filePath, defaultValue = {}) {
  try {
    if (await exists(filePath)) {
      return await fs.readJson(filePath);
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error.message);
    return defaultValue;
  }
}

/**
 * Write JSON file safely
 * @param {string} filePath - Path to write to
 * @param {Object} data - Data to write
 * @param {Object} options - Write options
 * @returns {Promise<void>}
 */
export async function writeJSON(filePath, data, options = { spaces: 2 }) {
  await ensureDir(path.dirname(filePath));
  await fs.writeJson(filePath, data, options);
}

/**
 * Read text file safely
 * @param {string} filePath - Path to text file
 * @param {string} defaultValue - Default value if file doesn't exist
 * @returns {Promise<string>} File contents or default value
 */
export async function readFile(filePath, defaultValue = '') {
  try {
    if (await exists(filePath)) {
      return await fs.readFile(filePath, 'utf-8');
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Failed to read file ${filePath}:`, error.message);
    return defaultValue;
  }
}

/**
 * Write text file safely
 * @param {string} filePath - Path to write to
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 */
export async function writeFile(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Get all files matching a pattern
 * @param {string} dirPath - Directory to search
 * @param {RegExp|string} pattern - Pattern to match (regex or extension)
 * @returns {Promise<Array<string>>} Array of matching files
 */
export async function getFiles(dirPath, pattern) {
  try {
    if (!await exists(dirPath)) {
      return [];
    }

    const files = await fs.readdir(dirPath);
    
    if (typeof pattern === 'string') {
      // Extension matching
      return files.filter(file => file.endsWith(pattern));
    } else if (pattern instanceof RegExp) {
      // Regex matching
      return files.filter(file => pattern.test(file));
    }
    
    return files;
  } catch (error) {
    console.warn(`Failed to read directory ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Clean up old files based on age
 * @param {string} dirPath - Directory to clean
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {Promise<number>} Number of files removed
 */
export async function cleanupOldFiles(dirPath, maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
  try {
    if (!await exists(dirPath)) {
      return 0;
    }

    const files = await fs.readdir(dirPath);
    const now = Date.now();
    let removedCount = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAgeMs) {
        await fs.remove(filePath);
        removedCount++;
      }
    }

    return removedCount;
  } catch (error) {
    console.warn(`Failed to cleanup directory ${dirPath}:`, error.message);
    return 0;
  }
}

/**
 * Calculate directory size
 * @param {string} dirPath - Directory path
 * @returns {Promise<number>} Size in bytes
 */
export async function getDirectorySize(dirPath) {
  try {
    if (!await exists(dirPath)) {
      return 0;
    }

    let totalSize = 0;
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.warn(`Failed to calculate directory size ${dirPath}:`, error.message);
    return 0;
  }
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

