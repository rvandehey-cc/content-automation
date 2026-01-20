/**
 * @fileoverview Unit tests for content-migration-path.js utilities
 * @author Content Automation Team
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { extractDealerSlug, ensureContentMigrationFolders } from '../../../src/utils/content-migration-path.js';

describe('extractDealerSlug', () => {
  describe('Basic URL parsing', () => {
    test('extracts dealer from simple domain', () => {
      expect(extractDealerSlug('https://www.zimbricknissan.com')).toBe('zimbricknissan');
    });

    test('extracts dealer from www-prefixed domain', () => {
      expect(extractDealerSlug('https://www.madisoncars.com/blog')).toBe('madisoncars');
    });

    test('extracts dealer from non-www domain', () => {
      expect(extractDealerSlug('https://dealer.com/inventory')).toBe('dealer');
    });

    test('handles .net domains', () => {
      expect(extractDealerSlug('https://www.bestdealer.net')).toBe('bestdealer');
    });

    test('handles .org domains', () => {
      expect(extractDealerSlug('https://automall.org')).toBe('automall');
    });

    test('handles .io domains', () => {
      expect(extractDealerSlug('https://modern-dealer.io')).toBe('modern-dealer');
    });
  });

  describe('Subdomain handling', () => {
    test('extracts main domain from blog subdomain', () => {
      expect(extractDealerSlug('https://blog.dealer.com')).toBe('dealer');
    });

    test('extracts main domain from inventory subdomain', () => {
      expect(extractDealerSlug('https://inventory.cardealer.com')).toBe('cardealer');
    });

    test('extracts main domain from multiple subdomains', () => {
      expect(extractDealerSlug('https://blog.internal.dealer.com')).toBe('dealer');
    });

    test('handles single-word domain with subdomain', () => {
      expect(extractDealerSlug('https://www.blog.dealer.com')).toBe('dealer');
    });
  });

  describe('Special character handling', () => {
    test('converts underscores to hyphens', () => {
      expect(extractDealerSlug('https://dealer_name.com')).toBe('dealer-name');
    });

    test('throws error for invalid hostname with special characters', () => {
      expect(() => extractDealerSlug('https://dealer!@#.com')).toThrow();
    });

    test('handles multiple consecutive hyphens', () => {
      expect(extractDealerSlug('https://dealer---name.com')).toBe('dealer-name');
    });

    test('removes leading hyphens', () => {
      expect(extractDealerSlug('https://-dealer.com')).toBe('dealer');
    });

    test('removes trailing hyphens', () => {
      expect(extractDealerSlug('https://dealer-.com')).toBe('dealer');
    });

    test('handles mixed case by converting to lowercase', () => {
      expect(extractDealerSlug('https://DealerName.com')).toBe('dealername');
    });

    test('handles camelCase domains', () => {
      expect(extractDealerSlug('https://BestCarDealer.com')).toBe('bestcardealer');
    });
  });

  describe('Edge cases', () => {
    test('truncates very long domain names to 50 chars', () => {
      const longDomain = 'a'.repeat(100);
      const slug = extractDealerSlug(`https://${longDomain}.com`);
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    test('handles URL with path', () => {
      expect(extractDealerSlug('https://dealer.com/blog/article/title')).toBe('dealer');
    });

    test('handles URL with query params', () => {
      expect(extractDealerSlug('https://dealer.com?utm_source=google')).toBe('dealer');
    });

    test('handles URL with fragment', () => {
      expect(extractDealerSlug('https://dealer.com#section')).toBe('dealer');
    });

    test('handles URL with port', () => {
      expect(extractDealerSlug('https://dealer.com:8080')).toBe('dealer');
    });

    test('throws error for invalid URL', () => {
      expect(() => extractDealerSlug('not-a-url')).toThrow();
    });

    test('throws error for URL with very short domain (< 2 chars)', () => {
      expect(() => extractDealerSlug('https://a.com')).toThrow();
    });

    test('handles hyphenated dealer names', () => {
      expect(extractDealerSlug('https://zimbrick-nissan.com')).toBe('zimbrick-nissan');
    });

    test('handles numeric domains', () => {
      expect(extractDealerSlug('https://dealer123.com')).toBe('dealer123');
    });
  });

  describe('Real-world dealer examples', () => {
    test('zimbrick nissan', () => {
      expect(extractDealerSlug('https://www.zimbricknissan.com/blog/article')).toBe('zimbricknissan');
    });

    test('madison ford', () => {
      expect(extractDealerSlug('https://madisonford.com/new-vehicles')).toBe('madisonford');
    });

    test('suburban auto group', () => {
      expect(extractDealerSlug('https://www.suburbanautogroup.com')).toBe('suburbanautogroup');
    });

    test('blog subdomain dealer', () => {
      expect(extractDealerSlug('https://blog.dealership.com/article')).toBe('dealership');
    });
  });
});

describe('ensureContentMigrationFolders', () => {
  describe('Dealer-based folder structure', () => {
    test('creates dealer-based folder structure', async () => {
      const paths = await ensureContentMigrationFolders('test-dealer');
      
      expect(paths).toHaveProperty('base');
      expect(paths).toHaveProperty('dealerBase');
      expect(paths).toHaveProperty('csv');
      expect(paths).toHaveProperty('images');
      expect(paths).toHaveProperty('csvFile');
      
      expect(paths.dealerBase).toContain('test-dealer');
      expect(paths.csv).toContain('test-dealer/csv');
      expect(paths.images).toContain('test-dealer/images');
    });

    test('includes date in image subfolder path', async () => {
      const paths = await ensureContentMigrationFolders('dealer');
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      
      expect(paths.images).toMatch(datePattern);
    });

    test('includes date in CSV filename', async () => {
      const paths = await ensureContentMigrationFolders('dealer');
      const datePattern = /wordpress-import-\d{4}-\d{2}-\d{2}\.csv/;
      
      expect(paths.csvFile).toMatch(datePattern);
    });

    test('cleans dealer slug before creating folders', async () => {
      const paths = await ensureContentMigrationFolders('Dealer Name!!!');
      
      expect(paths.dealerBase).toContain('dealer-name');
      expect(paths.dealerBase).not.toContain('!!!');
    });

    test('uses fallback for empty dealer slug', async () => {
      const paths = await ensureContentMigrationFolders('');
      
      expect(paths.dealerBase).toContain('unknown-dealer');
    });

    test('uses fallback for null dealer slug', async () => {
      const paths = await ensureContentMigrationFolders(null);
      
      expect(paths.dealerBase).toContain('unknown-dealer');
    });

    test('uses fallback for undefined dealer slug', async () => {
      const paths = await ensureContentMigrationFolders(undefined);
      
      expect(paths.dealerBase).toContain('unknown-dealer');
    });

    test('truncates very long dealer slugs', async () => {
      const longSlug = 'a'.repeat(100);
      const paths = await ensureContentMigrationFolders(longSlug);
      const dealerPart = paths.dealerBase.split('/').pop();
      
      expect(dealerPart.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Path structure validation', () => {
    test('CSV path is inside dealer folder', async () => {
      const paths = await ensureContentMigrationFolders('my-dealer');
      
      expect(paths.csv).toContain('my-dealer/csv');
    });

    test('images path includes dealer and date', async () => {
      const paths = await ensureContentMigrationFolders('my-dealer');
      
      expect(paths.images).toContain('my-dealer/images/');
      expect(paths.images).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    test('csvFile path is complete file path with date', async () => {
      const paths = await ensureContentMigrationFolders('my-dealer');
      
      expect(paths.csvFile).toContain('my-dealer/csv/wordpress-import-');
      expect(paths.csvFile).toMatch(/\.csv$/);
    });

    test('all paths share same base', async () => {
      const paths = await ensureContentMigrationFolders('dealer');
      
      expect(paths.csv.startsWith(paths.base)).toBe(true);
      expect(paths.images.startsWith(paths.base)).toBe(true);
      expect(paths.csvFile.startsWith(paths.base)).toBe(true);
    });
  });
});

