/**
 * @fileoverview Unit tests for CSVGeneratorService
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { CSVGeneratorService } from '../../../src/core/csv-generator.js';
import { JSDOM } from 'jsdom';

describe('CSVGeneratorService', () => {
  let csvService;

  beforeEach(() => {
    csvService = new CSVGeneratorService({
      contentType: 'post',
    });
  });

  describe('Constructor', () => {
    test('should initialize with default contentType', () => {
      const defaultService = new CSVGeneratorService();
      expect(defaultService.contentType).toBe('post');
    });

    test('should accept custom contentType', () => {
      const pageService = new CSVGeneratorService({ contentType: 'page' });
      expect(pageService.contentType).toBe('page');
    });

    test('should accept blogPostSelectors', () => {
      const selectors = { dateSelector: '.post-date', contentSelector: '.content' };
      const service = new CSVGeneratorService({ blogPostSelectors: selectors });
      expect(service.blogPostSelectors).toEqual(selectors);
    });
  });

  describe('CSV Escaping', () => {
    test('should escape quotes in CSV', () => {
      const result = csvService._escapeCSV('Text with "quotes"');
      expect(result).toBe('"Text with ""quotes"""');
    });

    test('should handle empty string', () => {
      const result = csvService._escapeCSV('');
      expect(result).toBe('""');
    });

    test('should handle null/undefined', () => {
      const result1 = csvService._escapeCSV(null);
      const result2 = csvService._escapeCSV(undefined);
      expect(result1).toBe('""');
      expect(result2).toBe('""');
    });

    test('should quote all fields', () => {
      const result = csvService._escapeCSV('Simple text');
      expect(result).toMatch(/^".*"$/);
    });
  });

  describe('Title Extraction', () => {
    test('should extract title from H1', () => {
      const html = '<html><body><h1>Page Title</h1></body></html>';
      const result = csvService._extractTitle(html, 'test.html');
      expect(result).toBe('Page Title');
    });

    test('should extract title from title tag', () => {
      const html = '<html><head><title>Page Title</title></head><body></body></html>';
      const result = csvService._extractTitle(html, 'test.html');
      expect(result).toBe('Page Title');
    });

    test('should fallback to filename', () => {
      const html = '<html><body></body></html>';
      const result = csvService._extractTitle(html, 'test-page.html');
      expect(result).toBeTruthy();
    });
  });

  describe('Slug Generation', () => {
    test('should generate slug from filename', () => {
      const slug = csvService._generateSlug('www.example.com_blog_post-title.html', 'Post Title');
      expect(slug).toBeTruthy();
      expect(typeof slug).toBe('string');
    });

    test('should handle special characters in slug', () => {
      const slug = csvService._generateSlug('test-page.html', 'Test Page');
      expect(slug).not.toContain(' ');
    });

    test('should limit slug length', () => {
      const longTitle = 'a'.repeat(300);
      const slug = csvService._generateSlug('test.html', longTitle);
      expect(slug.length).toBeLessThanOrEqual(255);
    });
  });

  describe('Date Extraction', () => {
    test('should extract date from common selectors', () => {
      const html = '<html><body><div class="post-date">2023-03-15</div></body></html>';
      const result = csvService._extractArticleDate(html);
      expect(result).toBeTruthy();
    });

    test('should return null when no date found', () => {
      const html = '<html><body><div>No date here</div></body></html>';
      const result = csvService._extractArticleDate(html);
      expect(result).toBeNull();
    });
  });

  describe('Date Parsing', () => {
    test('should parse ISO date format', () => {
      const result = csvService._parseDate('2023-03-15T10:30:00');
      expect(result).toMatch(/2023-03-15/);
    });

    test('should parse US date format', () => {
      const result = csvService._parseDate('March 15, 2023');
      expect(result).toMatch(/2023-03-15/);
    });

    test('should parse numeric date format', () => {
      const result = csvService._parseDate('03/15/2023');
      expect(result).toMatch(/2023-03-15/);
    });

    test('should return null for invalid date', () => {
      const result = csvService._parseDate('invalid date');
      expect(result).toBeNull();
    });
  });

  describe('Excerpt Extraction', () => {
    test('should extract excerpt from content', () => {
      const html = '<p>This is a long paragraph that should be truncated for the excerpt.</p>';
      const result = csvService._extractExcerpt(html);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    test('should limit excerpt length', () => {
      const longContent = '<p>' + 'a'.repeat(500) + '</p>';
      const result = csvService._extractExcerpt(longContent);
      expect(result.length).toBeLessThanOrEqual(200);
    });
  });
});
