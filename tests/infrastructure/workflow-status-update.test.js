/**
 * Test: Workflow status update functionality
 * Story: 6.2 - Status Update Logic
 * Story: 6.4 - Update Pre-push Hook for Push Tracking
 * AC: Event appending, YAML parsing, error handling
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

describe('Workflow Status Update Functionality', () => {
  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, '.husky', 'scripts', 'update-workflow-status.js');
  const testStatusFile = path.join(projectRoot, '_bmad-output', 'bmm-workflow-status.yaml');
  const backupFile = path.join(projectRoot, '_bmad-output', 'bmm-workflow-status.yaml.backup');

  beforeEach(() => {
    // Backup existing status file if it exists
    if (fs.existsSync(testStatusFile)) {
      fs.copyFileSync(testStatusFile, backupFile);
    }
  });

  afterEach(() => {
    // Restore original file
    if (fs.existsSync(backupFile)) {
      fs.moveSync(backupFile, testStatusFile, { overwrite: true });
    } else if (fs.existsSync(testStatusFile)) {
      // Clean up test file if no backup existed
      fs.removeSync(testStatusFile);
    }
  });

  test('should create automation_events array if missing', () => {
    // Create a basic status file without automation_events
    const initialData = {
      project: 'test-project',
      status: 'active'
    };
    fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf-8');

    // Run the script
    execSync(`node ${scriptPath} test_event '{"key":"value"}'`, { encoding: 'utf-8' });

    // Verify automation_events was created
    const updatedData = yaml.load(fs.readFileSync(testStatusFile, 'utf-8'));
    expect(updatedData).toHaveProperty('automation_events');
    expect(Array.isArray(updatedData.automation_events)).toBe(true);
  });

  test('should append event with timestamp, event type, and metadata', () => {
    // Create initial status file
    fs.ensureDirSync(path.dirname(testStatusFile));
    fs.writeFileSync(testStatusFile, yaml.dump({}), 'utf-8');

    // Run the script with metadata
    const metadata = { branch: 'main', user: 'test-user' };
    execSync(
      `node ${scriptPath} pre_push_validated '${JSON.stringify(metadata)}'`,
      { encoding: 'utf-8' }
    );

    // Verify event was appended
    const updatedData = yaml.load(fs.readFileSync(testStatusFile, 'utf-8'));
    expect(updatedData.automation_events).toHaveLength(1);

    const event = updatedData.automation_events[0];
    expect(event).toHaveProperty('timestamp');
    expect(event.event).toBe('pre_push_validated');
    expect(event.branch).toBe('main');
    expect(event.user).toBe('test-user');

    // Verify timestamp is ISO 8601 format
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  test('should append multiple events without overwriting', () => {
    // Create initial status file with one event
    const initialData = {
      automation_events: [
        {
          timestamp: '2026-01-01T00:00:00.000Z',
          event: 'initial_event'
        }
      ]
    };
    fs.ensureDirSync(path.dirname(testStatusFile));
    fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf-8');

    // Add two more events
    execSync(`node ${scriptPath} second_event '{"test":1}'`, { encoding: 'utf-8' });
    execSync(`node ${scriptPath} third_event '{"test":2}'`, { encoding: 'utf-8' });

    // Verify all events exist
    const updatedData = yaml.load(fs.readFileSync(testStatusFile, 'utf-8'));
    expect(updatedData.automation_events).toHaveLength(3);
    expect(updatedData.automation_events[0].event).toBe('initial_event');
    expect(updatedData.automation_events[1].event).toBe('second_event');
    expect(updatedData.automation_events[2].event).toBe('third_event');
  });

  test('should handle missing status file gracefully', () => {
    // Ensure file doesn't exist
    if (fs.existsSync(testStatusFile)) {
      fs.removeSync(testStatusFile);
    }

    // Run script - should not throw
    const output = execSync(`node ${scriptPath} test_event`, { encoding: 'utf-8' });

    // Verify it logged info message
    expect(output).toContain('BMM workflow status file not found');
    expect(output).toContain('Skipping status update');

    // Verify file was not created
    expect(fs.existsSync(testStatusFile)).toBe(false);
  });

  test('should handle malformed metadata JSON gracefully', () => {
    // Create status file
    fs.ensureDirSync(path.dirname(testStatusFile));
    fs.writeFileSync(testStatusFile, yaml.dump({}), 'utf-8');

    // Run with malformed JSON - should not throw
    let output;
    try {
      output = execSync(
        `node ${scriptPath} test_event 'invalid-json' 2>&1`,
        { encoding: 'utf-8' }
      );
    } catch (error) {
      output = error.stdout + error.stderr;
    }

    // Should warn about JSON parse failure
    expect(output).toContain('Failed to parse metadata JSON');

    // Event should still be created (with raw metadata)
    const updatedData = yaml.load(fs.readFileSync(testStatusFile, 'utf-8'));
    expect(updatedData.automation_events).toHaveLength(1);
    expect(updatedData.automation_events[0].event).toBe('test_event');
    expect(updatedData.automation_events[0].message).toBe('invalid-json');
  });

  test('should output success message on update', () => {
    // Create status file
    fs.ensureDirSync(path.dirname(testStatusFile));
    fs.writeFileSync(testStatusFile, yaml.dump({}), 'utf-8');

    // Run script and capture output
    const output = execSync(`node ${scriptPath} test_event`, { encoding: 'utf-8' });

    // Verify success message
    expect(output).toContain('✅ Updated BMM workflow status: test_event');
  });

  test('should preserve existing YAML structure', () => {
    // Create status file with existing structure
    const initialData = {
      project: 'test-project',
      metadata: {
        version: '1.0.0',
        author: 'test'
      },
      automation_events: []
    };
    fs.ensureDirSync(path.dirname(testStatusFile));
    fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf-8');

    // Add event
    execSync(`node ${scriptPath} test_event`, { encoding: 'utf-8' });

    // Verify existing structure is preserved
    const updatedData = yaml.load(fs.readFileSync(testStatusFile, 'utf-8'));
    expect(updatedData.project).toBe('test-project');
    expect(updatedData.metadata.version).toBe('1.0.0');
    expect(updatedData.metadata.author).toBe('test');
    expect(updatedData.automation_events).toHaveLength(1);
  });
});
