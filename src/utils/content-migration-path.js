/**
 * @fileoverview Utility to get the Content-Migration folder path
 * @author Content Automation Team
 */

import os from 'os';
import path from 'path';
import fs from 'fs-extra';

/**
 * Get the Content-Migration folder path on user's desktop
 * Falls back to project root/output/content-migration if desktop path fails
 * @returns {string} Path to Content-Migration folder
 */
export function getContentMigrationPath() {
  // Check for custom path from environment variable (useful for Docker)
  if (process.env.CONTENT_MIGRATION_PATH) {
    return process.env.CONTENT_MIGRATION_PATH;
  }

  try {
    // Try to use desktop path (works on Mac/Windows/Linux with desktop)
    const homeDir = os.homedir();
    let desktopPath;
    
    // Handle different OS desktop locations
    if (process.platform === 'win32') {
      desktopPath = path.join(homeDir, 'Desktop', 'Content-Migration');
    } else if (process.platform === 'darwin') {
      // macOS
      desktopPath = path.join(homeDir, 'Desktop', 'Content-Migration');
    } else {
      // Linux - try Desktop, fallback to home
      const desktop = path.join(homeDir, 'Desktop');
      try {
        if (fs.existsSync(desktop)) {
          desktopPath = path.join(desktop, 'Content-Migration');
        } else {
          desktopPath = path.join(homeDir, 'Content-Migration');
        }
      } catch {
        desktopPath = path.join(homeDir, 'Content-Migration');
      }
    }
    
    return desktopPath;
  } catch (error) {
    // Fallback to project root if desktop access fails (Docker, etc.)
    return path.resolve(process.cwd(), 'output', 'content-migration');
  }
}

/**
 * Extract dealer slug from URL domain
 * @param {string} url - Full URL to extract dealer from
 * @returns {string} Dealer slug
 * @throws {Error} If URL is invalid or dealer slug cannot be extracted
 * @example
 * extractDealerSlug('https://www.zimbricknissan.com/blog/article') 
 * // returns 'zimbricknissan'
 */
export function extractDealerSlug(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;

    // Remove www. prefix
    hostname = hostname.replace(/^www\./, '');

    // Remove common TLDs
    hostname = hostname.replace(/\.(com|net|org|io|co)$/, '');

    // Handle subdomains - take the LAST part (main domain)
    // e.g., blog.dealer → dealer, blog.internal.dealer → dealer
    const parts = hostname.split('.');
    hostname = parts[parts.length - 1];

    // Clean and format
    const slug = hostname
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    if (!slug || slug.length < 2) {
      throw new Error('Unable to extract meaningful dealer slug from URL');
    }

    return slug;
  } catch (error) {
    throw new Error(`Failed to extract dealer slug from URL: ${error.message}`);
  }
}

/**
 * Ensure Content-Migration folder structure exists with dealer-based organization
 * @param {string} dealerSlug - Dealer identifier (e.g., 'zimbrick-nissan')
 * @returns {Promise<Object>} Object with paths for images and csv
 */
export async function ensureContentMigrationFolders(dealerSlug) {
  if (!dealerSlug) {
    dealerSlug = 'unknown-dealer';
    console.warn('⚠️  No dealer slug provided, using fallback: unknown-dealer');
  }

  // Clean and validate dealer slug
  const cleanSlug = dealerSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const basePath = getContentMigrationPath();
  const dealerBase = path.join(basePath, cleanSlug);
  
  // Generate date string for image subfolder and CSV filename
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const paths = {
    base: basePath,
    dealerBase: dealerBase,
    csv: path.join(dealerBase, 'csv'),
    images: path.join(dealerBase, 'images', dateStr), // Dated subfolder
    csvFile: path.join(dealerBase, 'csv', `wordpress-import-${dateStr}.csv`),
  };

  // Create all necessary directories
  await fs.ensureDir(paths.csv);
  await fs.ensureDir(paths.images);

  return paths;
}

/**
 * Copy files to Content-Migration folder
 * @param {string} sourcePath - Source file or directory path
 * @param {string} destPath - Destination path
 * @param {boolean} isDirectory - Whether source is a directory
 * @returns {Promise<void>}
 */
export async function copyToContentMigration(sourcePath, destPath, isDirectory = false) {
  try {
    if (isDirectory) {
      await fs.copy(sourcePath, destPath, { overwrite: true });
    } else {
      await fs.ensureDir(path.dirname(destPath));
      await fs.copyFile(sourcePath, destPath);
    }
  } catch (error) {
    console.error(`Failed to copy to Content-Migration: ${error.message}`);
    throw error;
  }
}

