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
 * Ensure Content-Migration folder structure exists
 * @param {string} runId - Run ID to create subfolder
 * @returns {Promise<Object>} Object with paths for images and csv
 */
export async function ensureContentMigrationFolders(runId) {
  const basePath = getContentMigrationPath();
  
  const paths = {
    base: basePath,
    images: path.join(basePath, 'images'),
    csv: path.join(basePath, 'csv'),
    runImages: path.join(basePath, 'images', runId),
    runCsv: path.join(basePath, 'csv', runId),
  };

  // Create all necessary directories
  await fs.ensureDir(paths.runImages);
  await fs.ensureDir(paths.runCsv);

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

