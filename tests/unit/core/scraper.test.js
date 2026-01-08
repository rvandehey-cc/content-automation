/**
 * @fileoverview Unit tests for HTMLScraperService
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { HTMLScraperService } from '../../../src/core/scraper.js';

describe('HTMLScraperService', () => {
  let scraper;

  beforeEach(() => {
    scraper = new HTMLScraperService();
  });

  afterEach(async () => {
    if (scraper) {
      await scraper.cleanup();
    }
  });

  describe('extractUrlsFromText', () => {
    test('should extract URLs from text', () => {
      const text = 'https://example.com/page1\nhttps://example.com/page2';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://example.com/page1');
      expect(result[1].url).toBe('https://example.com/page2');
    });

    test('should skip comments', () => {
      const text = '# Comment\nhttps://example.com/page1\n// Another comment';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/page1');
    });

    test('should parse content type from line', () => {
      const text = 'https://example.com/blog post\nhttps://example.com/page page';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result[0].type).toBe('post');
      expect(result[1].type).toBe('page');
    });

    test('should remove trailing punctuation from URLs', () => {
      const text = 'https://example.com/page1.\nhttps://example.com/page2,';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result[0].url).toBe('https://example.com/page1');
      expect(result[1].url).toBe('https://example.com/page2');
    });

    test('should filter duplicate URLs', () => {
      const text = 'https://example.com/page1\nhttps://example.com/page1';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result).toHaveLength(1);
    });

    test('should validate URL format', () => {
      const text = 'not-a-url\nhttps://example.com/valid';
      const result = scraper.extractUrlsFromText(text);
      
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com/valid');
    });
  });
});
