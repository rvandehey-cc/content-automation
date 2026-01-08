/**
 * @fileoverview Unit tests for ContentProcessorService
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { ContentProcessorService } from '../../../src/core/processor.js';

describe('ContentProcessorService', () => {
  let processor;

  beforeEach(() => {
    processor = new ContentProcessorService({
      contentType: 'post',
    });
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultProcessor = new ContentProcessorService();
      expect(defaultProcessor.contentType).toBe('post');
    });

    test('should accept custom options', () => {
      const customProcessor = new ContentProcessorService({
        contentType: 'page',
        customRemoveSelectors: ['.ad', '.sidebar'],
      });
      
      expect(customProcessor.contentType).toBe('page');
      expect(customProcessor.customRemoveSelectors).toEqual(['.ad', '.sidebar']);
    });
  });

  describe('Content Type Processing', () => {
    test('should process posts differently than pages', () => {
      const postProcessor = new ContentProcessorService({ contentType: 'post' });
      const pageProcessor = new ContentProcessorService({ contentType: 'page' });
      
      expect(postProcessor.contentType).toBe('post');
      expect(pageProcessor.contentType).toBe('page');
    });

    test('should accept custom remove selectors', () => {
      const customProcessor = new ContentProcessorService({
        customRemoveSelectors: ['.ad', '.sidebar'],
      });
      
      expect(customProcessor.customRemoveSelectors).toEqual(['.ad', '.sidebar']);
    });
  });
});
