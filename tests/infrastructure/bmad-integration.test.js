import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

describe('BMAD Workflow Integration', () => {
    const projectRoot = process.cwd();
    const scriptsDir = path.join(projectRoot, '.husky', 'scripts');
    const statusScriptPath = path.join(scriptsDir, 'update-bmm-status.js');
    const testStatusFile = path.join(projectRoot, '_bmad-output', 'bmm-workflow-status-test.yaml');

    beforeEach(() => {
        // Clean up test status file before each test
        if (fs.existsSync(testStatusFile)) {
            fs.removeSync(testStatusFile);
        }
    });

    afterEach(() => {
        // Clean up test status file after each test
        if (fs.existsSync(testStatusFile)) {
            fs.removeSync(testStatusFile);
        }
    });

    // Story 6.2: Status Update Logic
    describe('Status Update Script (Story 6.2)', () => {
        test('update-bmm-status.js script should exist', () => {
            const exists = fs.existsSync(statusScriptPath);
            expect(exists).toBe(true);
        });

        test('script should be executable (have shebang)', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
        });

        test('script should use js-yaml for YAML parsing', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            expect(content).toContain('js-yaml');
        });

        test('script should use fs-extra for file operations', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            expect(content).toContain('fs-extra');
        });

        test('script should have updateWorkflowStatus function', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            expect(content).toContain('updateWorkflowStatus');
        });

        test('script should accept event type and metadata as command-line arguments', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            expect(content).toContain('process.argv');
        });

        test('script should create automation_events array if not exists', () => {
            // Create a test status file without automation_events
            const initialData = {
                project: 'test-project',
                generated: new Date().toISOString()
            };
            fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf8');

            // Run the script with test arguments
            try {
                execSync(
                    `node ${statusScriptPath} commit "test commit" --status-file="${testStatusFile}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                // Ignore errors for now, we're just testing if events array is created
            }

            // Read the updated file
            const updatedContent = fs.readFileSync(testStatusFile, 'utf8');
            const updatedData = yaml.load(updatedContent);

            expect(updatedData).toHaveProperty('automation_events');
            expect(Array.isArray(updatedData.automation_events)).toBe(true);
        });

        test('script should append events with timestamp in ISO 8601 format', () => {
            // Create a test status file
            const initialData = {
                project: 'test-project',
                automation_events: []
            };
            fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf8');

            // Run the script
            try {
                execSync(
                    `node ${statusScriptPath} commit "test commit message" --status-file="${testStatusFile}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                // Ignore
            }

            // Read and parse the updated file
            const updatedContent = fs.readFileSync(testStatusFile, 'utf8');
            const updatedData = yaml.load(updatedContent);

            expect(updatedData.automation_events).toHaveLength(1);
            expect(updatedData.automation_events[0]).toHaveProperty('timestamp');

            // Validate ISO 8601 format
            const timestamp = updatedData.automation_events[0].timestamp;
            expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        });

        test('script should append events with event type and metadata', () => {
            // Create a test status file
            const initialData = {
                project: 'test-project',
                automation_events: []
            };
            fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf8');

            // Run the script with event type and metadata
            try {
                execSync(
                    `node ${statusScriptPath} commit "feat: add new feature" --status-file="${testStatusFile}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                // Ignore
            }

            // Read the updated file
            const updatedContent = fs.readFileSync(testStatusFile, 'utf8');
            const updatedData = yaml.load(updatedContent);

            expect(updatedData.automation_events[0]).toHaveProperty('event_type', 'commit');
            expect(updatedData.automation_events[0]).toHaveProperty('message', 'feat: add new feature');
        });

        test('script should preserve existing events when appending', () => {
            // Create a test status file with existing events
            const initialData = {
                project: 'test-project',
                automation_events: [
                    {
                        timestamp: '2026-01-01T00:00:00.000Z',
                        event_type: 'commit',
                        message: 'existing event'
                    }
                ]
            };
            fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf8');

            // Run the script to add a new event
            try {
                execSync(
                    `node ${statusScriptPath} push "pushed to main" --status-file="${testStatusFile}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                // Ignore
            }

            // Read the updated file
            const updatedContent = fs.readFileSync(testStatusFile, 'utf8');
            const updatedData = yaml.load(updatedContent);

            expect(updatedData.automation_events).toHaveLength(2);
            expect(updatedData.automation_events[0].message).toBe('existing event');
            expect(updatedData.automation_events[1].message).toBe('pushed to main');
        });

        test('script should output success message', () => {
            // Create a test status file
            const initialData = {
                project: 'test-project',
                automation_events: []
            };
            fs.writeFileSync(testStatusFile, yaml.dump(initialData), 'utf8');

            // Run the script and capture output
            let output;
            try {
                output = execSync(
                    `node ${statusScriptPath} commit "test" --status-file="${testStatusFile}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                output = error.stdout || error.stderr;
            }

            expect(output).toContain('✅ Updated BMM workflow status');
        });

        test('script should handle errors gracefully with warning messages', () => {
            // Try to write to a non-existent directory
            const invalidPath = '/nonexistent/path/status.yaml';

            let output;
            let exitCode;
            try {
                output = execSync(
                    `node ${statusScriptPath} commit "test" --status-file="${invalidPath}"`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
                exitCode = 0;
            } catch (error) {
                output = error.stdout || error.stderr || '';
                exitCode = error.status;
            }

            // Script should output warning and exit with 0 (not fail the process)
            expect(output).toContain('⚠️');
            expect(exitCode).toBe(0);
        });

        test('script should validate command-line arguments', () => {
            // Run script without required arguments
            let output;
            try {
                output = execSync(
                    `node ${statusScriptPath}`,
                    { encoding: 'utf8', stdio: 'pipe' }
                );
            } catch (error) {
                output = error.stdout || error.stderr || '';
            }

            // Should show usage information
            expect(output).toContain('Usage:');
        });

        test('script should use default status file path if not specified', () => {
            const content = fs.readFileSync(statusScriptPath, 'utf8');
            // Check for both path components in the file
            expect(content).toContain('_bmad-output');
            expect(content).toContain('bmm-workflow-status.yaml');
        });
    });
});
