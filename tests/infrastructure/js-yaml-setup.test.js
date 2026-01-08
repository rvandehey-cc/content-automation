/**
 * Test: js-yaml dependency installation and availability
 * Story: 6.1 - Install js-yaml and Create Workflow Status Update Script
 * AC: 1 - js-yaml installed as dev dependency
 */

import fs from 'fs';
import path from 'path';

describe('js-yaml dependency', () => {
  test('should be installed as a dev dependency', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.devDependencies).toBeDefined();
    expect(packageJson.devDependencies['js-yaml']).toBeDefined();
    expect(packageJson.devDependencies['js-yaml']).toMatch(/^\^?\d+\.\d+\.\d+/);
  });

  test('should be importable', async () => {
    const yaml = await import('js-yaml');

    expect(yaml).toBeDefined();
    expect(typeof yaml.load).toBe('function');
    expect(typeof yaml.dump).toBe('function');
  });
});
