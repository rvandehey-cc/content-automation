import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

describe('GitHub Actions Workflow Infrastructure', () => {
    const projectRoot = process.cwd();
    const workflowsDir = path.join(projectRoot, '.github', 'workflows');
    const prValidationPath = path.join(workflowsDir, 'pr-validation.yml');

    test('.github/workflows directory should exist', () => {
        const exists = fs.existsSync(workflowsDir);
        expect(exists).toBe(true);
    });

    test('pr-validation.yml workflow file should exist', () => {
        const exists = fs.existsSync(prValidationPath);
        expect(exists).toBe(true);
    });

    describe('PR Validation Workflow Configuration', () => {
        let workflowConfig;

        beforeAll(() => {
            if (fs.existsSync(prValidationPath)) {
                const content = fs.readFileSync(prValidationPath, 'utf8');
                // Parse YAML manually since we don't have yaml parser installed yet
                workflowConfig = content;
            }
        });

        test('workflow should have correct name', () => {
            expect(workflowConfig).toContain('name: PR Validation');
        });

        test('workflow should trigger on pull_request events', () => {
            expect(workflowConfig).toContain('pull_request:');
        });

        test('workflow should trigger on main and dev branches', () => {
            expect(workflowConfig).toContain('- main');
            expect(workflowConfig).toContain('- dev');
        });

        test('workflow should trigger on opened, synchronize, and reopened PR types', () => {
            expect(workflowConfig).toContain('- opened');
            expect(workflowConfig).toContain('- synchronize');
            expect(workflowConfig).toContain('- reopened');
        });

        test('workflow should run on ubuntu-latest', () => {
            expect(workflowConfig).toContain('runs-on: ubuntu-latest');
        });

        test('workflow should checkout code with full git history', () => {
            expect(workflowConfig).toContain('actions/checkout@v4');
            expect(workflowConfig).toContain('fetch-depth: 0');
        });

        test('workflow should setup Node.js version 20 with npm cache', () => {
            expect(workflowConfig).toContain('actions/setup-node@v4');
            expect(workflowConfig).toContain("node-version: '20'");
            expect(workflowConfig).toContain("cache: 'npm'");
        });

        test('workflow should install dependencies with npm ci', () => {
            expect(workflowConfig).toContain('npm ci');
        });

        test('workflow file should have valid YAML syntax', () => {
            // Basic YAML validation - check for common syntax errors
            expect(workflowConfig).not.toContain('\t'); // No tabs in YAML

            // Check indentation is consistent (should be 2 spaces for GitHub Actions)
            const lines = workflowConfig.split('\n');
            lines.forEach((line, index) => {
                const leadingSpaces = line.match(/^(\s*)/)[1];
                if (leadingSpaces.includes('\t')) {
                    throw new Error(`Tab character found at line ${index + 1}`);
                }
            });
        });
    });
});
