/**
 * Site Profile Configuration Types
 * Defines the structure for site-specific scraping and processing configurations
 */

export interface SiteProfileConfig {
  // Provider/Platform Information
  provider?: string; // e.g., "Dealer.com", "DealerOn", "WordPress", "Custom"
  
  // Scraper Configuration
  scraper?: {
    contentSelectors?: string[]; // CSS selectors to try for content extraction (in order of preference)
    waitTime?: number; // Milliseconds to wait after page load
    timeout?: number; // Page load timeout
    maxRetries?: number; // Maximum retry attempts
    userAgent?: string; // Custom user agent string
  };
  
  // Blog Post Configuration
  blogPost?: {
    contentSelector?: string; // CSS selector for main blog post content area
    dateSelector?: string; // CSS selector for publication date
    titleSelector?: string; // CSS selector for post title (if different from h1)
    excludeSelectors?: string[]; // CSS selectors for elements to exclude from blog posts
  };
  
  // Page Configuration
  page?: {
    contentSelector?: string; // CSS selector for main page content area
    excludeSelectors?: string[]; // CSS selectors for elements to exclude from pages
  };
  
  // Processing Configuration
  processor?: {
    customRemoveSelectors?: string[]; // CSS selectors for elements to always remove
    preserveBootstrapClasses?: boolean; // Whether to preserve Bootstrap layout classes
    removeAllClasses?: boolean; // Whether to remove all classes (overrides preserveBootstrapClasses)
    removeAllIds?: boolean; // Whether to remove all ID attributes
  };
  
  // Image Processing
  images?: {
    enabled?: boolean; // Whether to download images
    maxConcurrent?: number; // Maximum concurrent image downloads
    timeout?: number; // Image download timeout
    allowedFormats?: string[]; // Allowed image formats (jpg, png, etc.)
  };
}

export interface SiteProfile {
  id: string;
  name: string;
  description: string | null;
  config: SiteProfileConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

