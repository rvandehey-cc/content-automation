#!/usr/bin/env node

/**
 * Update BMM Workflow Status Script
 * Story: 6.1 - Install js-yaml and Create Workflow Status Update Script
 * Story: 6.2 - Status Update Logic
 * Story: 6.4 - Update Pre-push Hook for Push Tracking
 *
 * Purpose: Logs automation events to BMM workflow status files for tracking.
 * Gracefully handles missing status file (logs info, no error exit).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get project root (2 levels up from .husky/scripts/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Define workflow status file path (ARCH7, ARCH8)
const WORKFLOW_STATUS_FILE = join(projectRoot, '_bmad-output/bmm-workflow-status.yaml');

/**
 * Updates the workflow status file with a new automation event
 * @param {string} eventType - Type of event (e.g., 'commit', 'pre_push_validated')
 * @param {object} metadata - Additional metadata for the event
 */
function updateWorkflowStatus(eventType, metadata = {}) {
  try {
    // Check if status file exists (NFR9: Graceful degradation)
    if (!existsSync(WORKFLOW_STATUS_FILE)) {
      console.log('[INFO] BMM workflow status file not found. Skipping status update.');
      console.log(`[INFO] Expected location: ${WORKFLOW_STATUS_FILE}`);
      return;
    }

    // Read existing YAML content (AC: 3)
    const yamlContent = readFileSync(WORKFLOW_STATUS_FILE, 'utf-8');

    // Parse YAML using js-yaml (AC: 4)
    const statusData = yaml.load(yamlContent) || {};

    // Create automation_events array if it doesn't exist (AC: 5)
    if (!statusData.automation_events) {
      statusData.automation_events = [];
    }

    // Append new event with timestamp, event type, and metadata (AC: 6)
    const newEvent = {
      timestamp: new Date().toISOString(), // ISO 8601 format
      event: eventType,
      ...metadata
    };

    statusData.automation_events.push(newEvent);

    // Write updated YAML back to file (AC: 7)
    const updatedYaml = yaml.dump(statusData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });

    writeFileSync(WORKFLOW_STATUS_FILE, updatedYaml, 'utf-8');

    // Output success message (AC: 8)
    console.log(`✅ Updated BMM workflow status: ${eventType}`);

  } catch (error) {
    // Graceful error handling - warn but don't fail (AC: 9, NFR9)
    console.warn(`⚠️ Failed to update workflow status: ${error.message}`);
    // Don't exit with error code - this is non-critical
  }
}

/**
 * Main execution
 */
function main() {
  // Parse command-line arguments (AC: 10)
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: update-workflow-status.js <event-type> [metadata-json]');
    console.error('Example: update-workflow-status.js commit \'{"branch": "main"}\'');
    process.exit(1);
  }

  const eventType = args[0];
  let metadata = {};

  // Parse metadata if provided (AC: 10)
  if (args.length > 1) {
    try {
      metadata = JSON.parse(args[1]);
    } catch (error) {
      console.warn(`⚠️ Failed to parse metadata JSON: ${error.message}`);
      console.warn('Using raw metadata string instead');
      metadata = { message: args[1] };
    }
  }

  // Execute the update
  updateWorkflowStatus(eventType, metadata);
}

main();
