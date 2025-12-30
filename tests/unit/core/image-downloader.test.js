/**
 * @fileoverview Unit tests for ImageDownloaderService
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ImageDownloaderService } from '../../../src/core/image-downloader.js';

describe('ImageDownloaderService', () => {
  let imageService;

  beforeEach(() => {
    imageService = new ImageDownloaderService();
  });

  describe('Constructor', () => {
    test('should initialize with default config', () => {
      expect(imageService.config).toBeDefined();
      expect(imageService.config.enabled).toBe(true);
    });

    test('should accept custom options', () => {
      const customService = new ImageDownloaderService({
        maxConcurrent: 10,
        timeout: 60000,
      });
      
      expect(customService.config.maxConcurrent).toBe(10);
      expect(customService.config.timeout).toBe(60000);
    });
  });

  describe('Image Filtering', () => {
    test('should filter avatar images by URL', () => {
      const imageData = {
        url: 'https://example.com/avatar.jpg',
        alt: 'User photo',
      };
      
      const result = imageService._shouldFilterImage(imageData);
      expect(result.shouldFilter).toBe(true);
    });

    test('should filter testimonial images', () => {
      const imageData = {
        url: 'https://example.com/testimonial.jpg',
        alt: 'Customer testimonial',
      };
      
      const result = imageService._shouldFilterImage(imageData);
      expect(result.shouldFilter).toBe(true);
    });

    test('should not filter regular content images', () => {
      const imageData = {
        url: 'https://example.com/product.jpg',
        alt: 'Product image',
      };
      
      const result = imageService._shouldFilterImage(imageData);
      expect(result.shouldFilter).toBe(false);
    });

    test('should filter by alt text patterns', () => {
      const imageData = {
        url: 'https://example.com/image.jpg',
        alt: 'User avatar photo',
      };
      
      const result = imageService._shouldFilterImage(imageData);
      expect(result.shouldFilter).toBe(true);
    });
  });
});
