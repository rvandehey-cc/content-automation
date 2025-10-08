/**
 * @fileoverview Centralized error handling and logging utilities
 * @author Content Automation Team
 * @version 1.0.0
 */

import winston from 'winston';

/**
 * Custom error classes for better error handling
 */
export class ScraperError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ScraperError';
    this.cause = cause;
  }
}

export class ImageDownloadError extends Error {
  constructor(message, url = null, cause = null) {
    super(message);
    this.name = 'ImageDownloadError';
    this.url = url;
    this.cause = cause;
  }
}

export class ProcessingError extends Error {
  constructor(message, filename = null, cause = null) {
    super(message);
    this.name = 'ProcessingError';
    this.filename = filename;
    this.cause = cause;
  }
}

export class CSVGenerationError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'CSVGenerationError';
    this.cause = cause;
  }
}

/**
 * Logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'content-automation' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Error handler with logging and user-friendly messages
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context about the error
 * @returns {Object} Structured error response
 */
export function handleError(error, context = {}) {
  const errorInfo = {
    type: error.name || 'Error',
    message: error.message,
    timestamp: new Date().toISOString(),
    context
  };

  // Log to file
  logger.error('Error occurred', {
    ...errorInfo,
    stack: error.stack,
    cause: error.cause
  });

  // Return user-friendly error info
  return {
    success: false,
    error: errorInfo,
    userMessage: getUserFriendlyMessage(error)
  };
}

/**
 * Convert technical errors to user-friendly messages
 * @param {Error} error - The error to process
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(error) {
  switch (error.name) {
    case 'ScraperError':
      if (error.message.includes('timeout')) {
        return 'The website took too long to respond. Try again or check your internet connection.';
      }
      if (error.message.includes('404')) {
        return 'The page could not be found. Please check the URL.';
      }
      return 'Failed to scrape the website. Please check the URL and try again.';

    case 'ImageDownloadError':
      return `Failed to download image${error.url ? ` from ${error.url}` : ''}. The image may no longer exist or be accessible.`;

    case 'ProcessingError':
      return `Failed to process content${error.filename ? ` for ${error.filename}` : ''}. Please check the HTML content.`;

    case 'CSVGenerationError':
      return 'Failed to generate WordPress CSV file. Please check the processed content.';

    default:
      return 'An unexpected error occurred. Please check the logs for more details.';
  }
}

/**
 * Progress tracking utility
 */
export class ProgressTracker {
  constructor(total, description = 'Processing') {
    this.total = total;
    this.current = 0;
    this.description = description;
    this.startTime = Date.now();
  }

  /**
   * Update progress and display status
   * @param {number} increment - How much to increment (default 1)
   * @param {string} status - Optional status message
   */
  update(increment = 1, status = null) {
    this.current += increment;
    const percentage = ((this.current / this.total) * 100).toFixed(1);
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = this.current > 0 ? (this.total - this.current) / rate : 0;

    console.log(`📊 ${this.description}: ${this.current}/${this.total} (${percentage}%) - ETA: ${Math.round(eta)}s${status ? ` - ${status}` : ''}`);
  }

  /**
   * Mark as complete
   */
  complete() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`✅ ${this.description} complete: ${this.total} items in ${totalTime}s`);
  }
}

/**
 * Retry utility with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} The result of the function
 */
export async function retry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: error.message,
        attempt,
        maxRetries
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export { logger };

