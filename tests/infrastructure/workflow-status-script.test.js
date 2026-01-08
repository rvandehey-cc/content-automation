/**
 * Test: Workflow status update script structure and functionality
 * Story: 6.1 - Install js-yaml and Create Workflow Status Update Script
 * AC: 2-7 - Script structure, imports, constants, and graceful handling
 */

import fs from 'fs';
import path from 'path';

describe('Workflow Status Update Script', () => {
  const projectRoot = process.cwd();
  const scriptsDir = path.join(projectRoot, '.husky', 'scripts');
  const scriptPath = path.join(scriptsDir, 'update-workflow-status.js');

  test('scripts directory should exist', () => {
    const exists = fs.existsSync(scriptsDir);
    expect(exists).toBe(true);
  });

  test('update-workflow-status.js should exist', () => {
    const exists = fs.existsSync(scriptPath);
    expect(exists).toBe(true);
  });

  test('script should be executable', () => {
    const stats = fs.statSync(scriptPath);
    const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
    expect(isExecutable).toBe(true);
  });

  test('script should have Node.js shebang', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/^#!.*node/);
  });

  test('script should import js-yaml', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('js-yaml');
  });

  test('script should import fs module', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/import.*fs|require.*fs/);
  });

  test('script should define WORKFLOW_STATUS_FILE constant', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toContain('WORKFLOW_STATUS_FILE');
    expect(content).toContain('_bmad-output/bmm-workflow-status.yaml');
  });

  test('script should check for file existence', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/existsSync|fs\.access/);
  });

  test('script should handle missing status file gracefully', () => {
    const content = fs.readFileSync(scriptPath, 'utf-8');
    // Should have some form of graceful exit or info message
    expect(content).toMatch(/console\.(log|info)|process\.exit\(0\)/);
  });
});
