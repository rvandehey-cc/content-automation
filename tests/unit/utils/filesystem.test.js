/**
 * @fileoverview Unit tests for filesystem utilities
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Note: These tests verify the utility functions exist and can be called
// Full integration testing would require actual file system operations

describe('Filesystem Utilities', () => {
  test('should have filesystem utility functions exported', async () => {
    const fsUtils = await import('../../../src/utils/filesystem.js');
    
    expect(fsUtils.ensureDir).toBeDefined();
    expect(fsUtils.exists).toBeDefined();
    expect(fsUtils.readJSON).toBeDefined();
    expect(fsUtils.writeJSON).toBeDefined();
    expect(fsUtils.readFile).toBeDefined();
    expect(fsUtils.writeFile).toBeDefined();
    expect(fsUtils.getFiles).toBeDefined();
  });

  test('ensureDir should be a function', async () => {
    const { ensureDir } = await import('../../../src/utils/filesystem.js');
    expect(typeof ensureDir).toBe('function');
  });

  test('exists should be a function', async () => {
    const { exists } = await import('../../../src/utils/filesystem.js');
    expect(typeof exists).toBe('function');
  });

  test('readJSON should be a function', async () => {
    const { readJSON } = await import('../../../src/utils/filesystem.js');
    expect(typeof readJSON).toBe('function');
  });

  test('writeJSON should be a function', async () => {
    const { writeJSON } = await import('../../../src/utils/filesystem.js');
    expect(typeof writeJSON).toBe('function');
  });

  test('readFile should be a function', async () => {
    const { readFile } = await import('../../../src/utils/filesystem.js');
    expect(typeof readFile).toBe('function');
  });

  test('writeFile should be a function', async () => {
    const { writeFile } = await import('../../../src/utils/filesystem.js');
    expect(typeof writeFile).toBe('function');
  });

  test('getFiles should be a function', async () => {
    const { getFiles } = await import('../../../src/utils/filesystem.js');
    expect(typeof getFiles).toBe('function');
  });
});
