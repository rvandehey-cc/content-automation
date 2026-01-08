/**
 * @fileoverview Unit tests for configuration system
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';

// Import config after setting up environment
let config, Config;

describe('Configuration System', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    
    // Re-import config after reset
    const configModule = await import('../../../src/config/index.js');
    config = configModule.default;
    Config = configModule.Config;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Config Class', () => {
    test('should load default configuration', () => {
      const configInstance = new Config();
      const scraperConfig = configInstance.get('scraper');
      
      expect(scraperConfig).toHaveProperty('headless');
      expect(scraperConfig).toHaveProperty('timeout');
      expect(scraperConfig).toHaveProperty('maxRetries');
    });

    test('should get module configuration', () => {
      const configInstance = new Config();
      const imagesConfig = configInstance.get('images');
      
      expect(imagesConfig).toHaveProperty('enabled');
      expect(imagesConfig).toHaveProperty('outputDir');
      expect(imagesConfig).toHaveProperty('maxConcurrent');
    });

    test('should return empty object for unknown module', () => {
      const configInstance = new Config();
      const unknownConfig = configInstance.get('unknown');
      
      expect(unknownConfig).toEqual({});
    });

    test('should update configuration at runtime', () => {
      const configInstance = new Config();
      configInstance.update('scraper', { timeout: 90000 });
      
      const scraperConfig = configInstance.get('scraper');
      expect(scraperConfig.timeout).toBe(90000);
    });

    test('should merge updates with existing configuration', () => {
      const configInstance = new Config();
      const originalTimeout = configInstance.get('scraper').timeout;
      
      configInstance.update('scraper', { maxRetries: 5 });
      const scraperConfig = configInstance.get('scraper');
      
      expect(scraperConfig.timeout).toBe(originalTimeout);
      expect(scraperConfig.maxRetries).toBe(5);
    });

    test('should resolve relative paths to absolute', () => {
      const configInstance = new Config();
      const absolutePath = configInstance.resolvePath('test/path');
      
      expect(path.isAbsolute(absolutePath)).toBe(true);
      expect(absolutePath).toContain('test/path');
    });

    test('should validate configuration', () => {
      const configInstance = new Config();
      const errors = configInstance.validate();
      
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    test('should export singleton instance', () => {
      expect(config).toBeInstanceOf(Config);
    });

    test('should allow getting configuration from singleton', () => {
      const scraperConfig = config.get('scraper');
      expect(scraperConfig).toBeDefined();
    });

    test('should allow updating singleton configuration', () => {
      config.update('scraper', { timeout: 80000 });
      const scraperConfig = config.get('scraper');
      expect(scraperConfig.timeout).toBe(80000);
    });
  });
});
