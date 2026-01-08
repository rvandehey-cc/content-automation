#!/usr/bin/env node

/**
 * BMAD Workflow Status Update Script
 *
 * Purpose: Appends automation events to the BMM workflow status file
 * to track all automation activity chronologically.
 *
 * Usage:
 *   node .husky/scripts/update-bmm-status.js <event-type> <message> [--status-file=<path>]
 *
 * Examples:
 *   node .husky/scripts/update-bmm-status.js commit "feat: add new feature"
 *   node .husky/scripts/update-bmm-status.js push "pushed to main"
 *   node .husky/scripts/update-bmm-status.js release "v1.2.0"
 *
 * Exit Codes:
 *   0 - Success (always, errors are handled gracefully)
 */

import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default status file path
const DEFAULT_STATUS_FILE = path.join(
    process.cwd(),
    '_bmad-output',
    'bmm-workflow-status.yaml'
);

/**
 * Parse command-line arguments
 * @returns {{ eventType: string, message: string, statusFile: string } | null}
 */
function parseArguments() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: update-bmm-status.js <event-type> <message> [--status-file=<path>]');
        console.log('');
        console.log('Examples:');
        console.log('  update-bmm-status.js commit "feat: add new feature"');
        console.log('  update-bmm-status.js push "pushed to main"');
        console.log('  update-bmm-status.js release "v1.2.0"');
        console.log('');
        return null;
    }

    const eventType = args[0];
    const message = args[1];

    // Look for --status-file argument
    let statusFile = DEFAULT_STATUS_FILE;
    const statusFileArg = args.find(arg => arg.startsWith('--status-file='));
    if (statusFileArg) {
        statusFile = statusFileArg.split('=')[1].replace(/["']/g, '');
    }

    return { eventType, message, statusFile };
}

/**
 * Update workflow status file with new event
 * @param {string} eventType - Type of event (commit, push, release, etc.)
 * @param {string} message - Event message/metadata
 * @param {string} statusFile - Path to status file
 */
async function updateWorkflowStatus(eventType, message, statusFile) {
    try {
        // Ensure directory exists
        const statusDir = path.dirname(statusFile);
        await fs.ensureDir(statusDir);

        // Read existing status file or create new structure
        let statusData = {};
        if (await fs.pathExists(statusFile)) {
            const fileContent = await fs.readFile(statusFile, 'utf8');
            statusData = yaml.load(fileContent) || {};
        } else {
            // Initialize with basic structure
            statusData = {
                project: 'wp-content-automation',
                generated: new Date().toISOString()
            };
        }

        // Ensure automation_events array exists
        if (!statusData.automation_events) {
            statusData.automation_events = [];
        }

        // Create new event with timestamp
        const newEvent = {
            timestamp: new Date().toISOString(),
            event_type: eventType,
            message: message
        };

        // Append event to array
        statusData.automation_events.push(newEvent);

        // Write updated YAML back to file
        const yamlContent = yaml.dump(statusData, {
            indent: 2,
            lineWidth: -1, // No line wrapping
            sortKeys: false // Preserve key order
        });

        await fs.writeFile(statusFile, yamlContent, 'utf8');

        // Output success message
        console.log(`✅ Updated BMM workflow status: ${eventType} - ${message}`);

    } catch (error) {
        // Handle errors gracefully - warn but don't fail the process
        console.log('⚠️  Warning: Failed to update BMM workflow status');
        console.log(`   Error: ${error.message}`);
        console.log('   Continuing without status tracking...');
    }
}

/**
 * Main execution function
 */
async function main() {
    const args = parseArguments();

    if (!args) {
        // Invalid arguments - exit gracefully
        process.exit(0);
    }

    await updateWorkflowStatus(args.eventType, args.message, args.statusFile);
    process.exit(0);
}

// Run main function
main();
