#!/usr/bin/env node

/**
 * Documentation Validation Script
 *
 * Purpose: Validates that critical architecture files aren't changed without
 * corresponding documentation updates.
 *
 * Usage: node .husky/scripts/validate-docs.js [base-ref]
 *        DOCS_BASE_REF=origin/dev node .husky/scripts/validate-docs.js
 *        DOCS_SUPPRESS_HEADER=1 node .husky/scripts/validate-docs.js
 *
 * Exit Codes:
 *   0 - Validation passed (docs are in sync or no critical changes)
 *   1 - Validation failed (critical files changed without doc updates)
 */

import { execSync } from 'child_process';

// Define critical files that require documentation updates
const CRITICAL_FILES = [
  'src/core/',
  'src/app/',
  'prisma/schema.prisma',
  'package.json',
  'src/config/'
];

// Define documentation files that should be updated
const DOC_FILES = [
  'docs/architecture.md',
  'docs/project-context.md',
  'docs/technology-stack.md',
  'docs/development-guide.md',
  'README.md'
];

// Define BMAD documentation directories
const BMAD_DOC_FILES = [
  '_bmad-output/docs/',
  '_bmad-output/analysis/'
];

/**
 * Get list of changed files from git diff
 * @returns {string[]} Array of changed file paths
 */
function getChangedFiles(baseRef) {
  try {
    const output = execSync(`git diff --name-only ${baseRef}...HEAD`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    return output
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
  } catch (error) {
    if (error.message.includes('unknown revision')) {
      console.log(`❌ Unable to compare with ${baseRef} (missing ref or detached HEAD)`);
      console.log('💡 Suggested fix: run `git fetch` or ensure the base ref exists');
      process.exit(1);
    }

    if (error.message.includes('not a git repository')) {
      console.log('❌ Not a git repository - documentation validation cannot run');
      process.exit(1);
    }

    // For other git errors, log and skip validation
    console.log('❌ Git command failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check if a file matches any critical file pattern
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file is critical
 */
function isCriticalFile(filePath) {
  return CRITICAL_FILES.some(pattern => {
    if (pattern.endsWith('/')) {
      // Directory pattern - match files starting with this path
      return filePath.startsWith(pattern);
    } else {
      // Exact file match
      return filePath === pattern;
    }
  });
}

/**
 * Check if a file is a documentation file
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file is documentation
 */
function isDocFile(filePath) {
  // Check regular doc files (exact match)
  if (DOC_FILES.includes(filePath)) {
    return true;
  }

  // Check BMAD doc directories (prefix match)
  return BMAD_DOC_FILES.some(pattern => filePath.startsWith(pattern));
}

/**
 * Main validation function
 */
function validateDocs() {
  if (process.env.DOCS_SUPPRESS_HEADER !== '1') {
    console.log('📚 Validating documentation synchronization...');
  }

  const baseRef = process.env.DOCS_BASE_REF || process.argv[2] || 'origin/main';
  const changedFiles = getChangedFiles(baseRef);

  if (changedFiles.length === 0) {
    console.log(`✅ No changes detected against ${baseRef} - validation passed`);
    process.exit(0);
  }

  // Find critical files that changed
  const criticalChanges = changedFiles.filter(file => isCriticalFile(file));

  if (criticalChanges.length === 0) {
    console.log(`✅ No critical files changed against ${baseRef} - validation passed`);
    process.exit(0);
  }

  // Find documentation files that changed
  const docChanges = changedFiles.filter(file => isDocFile(file));

  if (docChanges.length > 0) {
    console.log('✅ Documentation validation passed');
    console.log(`   Critical files changed: ${criticalChanges.length}`);
    console.log(`   Documentation files updated: ${docChanges.length}`);
    process.exit(0);
  }

  // Validation failed - critical files changed without doc updates
  console.log('');
  console.log('❌ Documentation validation failed!');
  console.log('');
  console.log('Critical files were modified without corresponding documentation updates:');
  console.log('');

  criticalChanges.forEach(file => {
    console.log(`  ⚠️  ${file}`);
  });

  console.log('');
  console.log('No documentation files were updated. Update at least one of these:');
  console.log('');

  DOC_FILES.forEach(doc => {
    console.log(`  📄 ${doc}`);
  });

  console.log('');
  console.log('BMAD documentation directories:');
  BMAD_DOC_FILES.forEach(doc => {
    console.log(`  📁 ${doc}`);
  });

  console.log('');
  console.log('💡 Suggested fix: Run `npm run docs:generate` to update documentation');
  console.log('');

  process.exit(1);
}

// Run validation
validateDocs();
