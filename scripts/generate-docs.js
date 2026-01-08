#!/usr/bin/env node

/**
 * Documentation Generation Script
 *
 * This script attempts to regenerate project documentation by:
 * 1. Invoking the BMAD document-project workflow (if available)
 * 2. Falling back to a warning message if BMAD tools are not installed
 *
 * Used during:
 * - Release workflow (automated documentation updates)
 * - Manual documentation generation (npm run docs:generate)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Check if BMAD tools are available
 */
function isBMADAvailable() {
  try {
    // Check for local claude installation
    execSync('which claude', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      // Check for npx claude as fallback
      execSync('npx claude --version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Check if BMAD workflow configuration exists
 */
function hasBMADWorkflow() {
  const workflowPath = join(projectRoot, '_bmad/bmm/workflows/document-project/workflow.yaml');
  return existsSync(workflowPath);
}

/**
 * Invoke BMAD document-project workflow
 */
function generateDocumentationWithBMAD() {
  console.log('📚 Invoking BMAD document-project workflow...');

  try {
    execSync('claude /bmad:bmm:workflows:document-project', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ Documentation generation completed successfully');
    return true;
  } catch (error) {
    console.error('⚠️ BMAD workflow execution failed:', error.message);
    return false;
  }
}

/**
 * Fallback when BMAD tools are not available
 */
function fallbackDocumentationGeneration() {
  console.warn('⚠️ BMAD tools not available - documentation generation skipped');
  console.warn('');
  console.warn('To enable automated documentation generation:');
  console.warn('1. Install Claude CLI: https://github.com/anthropics/claude-code');
  console.warn('2. Ensure BMAD workflows are configured in _bmad/ directory');
  console.warn('');
  console.warn('For manual documentation updates, edit files in _bmad-output/docs/');
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting documentation generation process...');
  console.log('');

  // Check if BMAD workflow exists
  if (!hasBMADWorkflow()) {
    console.warn('⚠️ BMAD workflow not found - documentation generation skipped');
    console.warn('Expected location: _bmad/bmm/workflows/document-project/workflow.yaml');
    console.warn('');
    return; // Exit gracefully
  }

  // Check if BMAD tools are available
  if (!isBMADAvailable()) {
    fallbackDocumentationGeneration();
    return; // Exit gracefully (not an error)
  }

  // Invoke BMAD workflow
  const success = generateDocumentationWithBMAD();

  if (!success) {
    console.warn('');
    console.warn('Documentation generation encountered issues but continuing...');
  }
}

// Run the script
main();
