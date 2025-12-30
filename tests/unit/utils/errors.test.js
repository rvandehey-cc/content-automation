/**
 * @fileoverview Unit tests for error handling utilities
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import {
  ScraperError,
  ImageDownloadError,
  ProcessingError,
  CSVGenerationError,
  handleError,
  retry,
  ProgressTracker
} from '../../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('ScraperError', () => {
    test('should create error with message', () => {
      const error = new ScraperError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ScraperError');
    });

    test('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new ScraperError('Test error', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('ImageDownloadError', () => {
    test('should create error with message and URL', () => {
      const error = new ImageDownloadError('Download failed', 'https://example.com/image.jpg');
      expect(error.message).toBe('Download failed');
      expect(error.url).toBe('https://example.com/image.jpg');
      expect(error.name).toBe('ImageDownloadError');
    });
  });

  describe('ProcessingError', () => {
    test('should create error with message and filename', () => {
      const error = new ProcessingError('Processing failed', 'test.html');
      expect(error.message).toBe('Processing failed');
      expect(error.filename).toBe('test.html');
      expect(error.name).toBe('ProcessingError');
    });
  });

  describe('CSVGenerationError', () => {
    test('should create error with message', () => {
      const error = new CSVGenerationError('CSV generation failed');
      expect(error.message).toBe('CSV generation failed');
      expect(error.name).toBe('CSVGenerationError');
    });
  });
});

describe('handleError', () => {
  test('should return structured error response', () => {
    const error = new Error('Test error');
    const context = { runId: '123' };
    const result = handleError(error, context);

    expect(result.success).toBe(false);
    expect(result.error.type).toBe('Error');
    expect(result.error.message).toBe('Test error');
    expect(result.error.context).toEqual(context);
    expect(result.userMessage).toBeDefined();
  });

  test('should handle custom error types', () => {
    const error = new ScraperError('Scraper failed');
    const result = handleError(error);

    expect(result.error.type).toBe('ScraperError');
  });
});

describe('retry', () => {
  test('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retry(fn, 3);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should retry on failure', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    
    jest.useFakeTimers();
    const resultPromise = retry(fn, 3, 10);
    
    // Fast-forward through delays
    await jest.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
    jest.useRealTimers();
  });

  test('should throw after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(retry(fn, 2, 10)).rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('ProgressTracker', () => {
  test('should initialize with total', () => {
    const tracker = new ProgressTracker(10, 'Test task');
    expect(tracker.total).toBe(10);
    expect(tracker.current).toBe(0);
  });

  test('should update progress', () => {
    const tracker = new ProgressTracker(10, 'Test task');
    tracker.update(5, 'Processing');
    
    expect(tracker.current).toBe(5);
  });

  test('should complete tracking', () => {
    const tracker = new ProgressTracker(10, 'Test task');
    tracker.update(10, 'Done');
    tracker.complete();
    
    expect(tracker.current).toBe(10);
  });
});
