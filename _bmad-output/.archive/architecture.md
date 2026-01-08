# Architecture Documentation

## Executive Summary

**wp-content-automation** is a Node.js CLI application designed to automate web content scraping and preparation for WordPress import. The system uses a service-oriented layered architecture with clean separation of concerns, enabling modular development and easy maintenance.

**Primary Purpose**: Extract content from websites (primarily automotive dealership sites), download and organize images, sanitize HTML content, and generate WordPress-ready CSV files.

**Architecture Style**: Service-Oriented Layered Architecture with Pipeline Orchestration

## Technology Stack

See [Technology Stack](./technology-stack.md) for complete details.

### Core Technologies
- **Runtime**: Node.js >=18.0.0
- **Module System**: ES6 Modules (`"type": "module"`)
- **Primary Language**: JavaScript (ES2020+)
- **Browser Automation**: Playwright (^1.40.0)
- **DOM Manipulation**: JSDOM (^23.2.0) and Cheerio (^1.0.0-rc.12)
- **Logging**: Winston (^3.11.0)
- **HTTP Client**: node-fetch (^3.3.2)
- **Concurrency**: p-queue (^7.4.1)

## Architecture Pattern

### Service-Oriented Layered Architecture

The system follows a clean layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│              CLI Layer (User Interface)                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ automation.js - Pipeline Orchestrator                 │ │
│  │ - User interaction and prompts                        │ │
│  │ - Progress tracking and display                       │ │
│  │ - Error handling and user feedback                    │ │
│  └───────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Service Layer (Business Logic)                 │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │ HTMLScraper  │ Image        │ Content      │ CSV      │ │
│  │ Service      │ Downloader   │ Processor    │ Generator│ │
│  │              │ Service      │ Service      │ Service  │ │
│  └──────────────┴──────────────┴──────────────┴──────────┘ │
├─────────────────────────────────────────────────────────────┤
│              Utility Layer (Shared Functionality)           │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ cli.js       │ errors.js    │ filesystem.js            │ │
│  │ - Progress   │ - Error      │ - File operations        │ │
│  │   bars       │   handling   │ - JSON I/O               │ │
│  │ - Prompts    │ - Retry      │ - Directory mgmt         │ │
│  │ - Tables     │   logic      │                          │ │
│  │              │ - Logging    │                          │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│           Configuration Layer (Settings Management)         │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ config/index.js - Centralized Configuration           │ │
│  │ - Environment variable integration                    │ │
│  │ - Default values                                      │ │
│  │ - Service-specific sections                           │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles

1. **Separation of Concerns**: Each layer and service has a single, well-defined responsibility
2. **Dependency Injection**: Services accept configuration via constructor options
3. **Configuration-Driven**: Externalized configuration via environment variables and config files
4. **Error Resilience**: Comprehensive error handling with retry mechanisms
5. **Progress Tracking**: Real-time feedback for long-running operations
6. **Modularity**: Services can be used independently or as part of the pipeline

## Service Architecture

### HTMLScraperService (`src/core/scraper.js`)

**Responsibility**: Web scraping with Playwright browser automation

**Key Features**:
- Cloudflare protection bypass
- Retry mechanisms with exponential backoff
- Cookie and session management
- Content extraction from dynamic pages
- Sequential URL processing (prevents server overwhelming)

**Input**: URLs from `data/urls.txt`
**Output**: Raw HTML files in `output/scraped-content/`

**Key Methods**:
- `loadUrls()` - Loads URLs from various sources
- `scrape(url)` - Scrapes a single URL
- `scrapeAll()` - Scrapes all URLs sequentially

**Error Handling**: Custom `ScraperError` class with retry logic

### ImageDownloaderService (`src/core/image-downloader.js`)

**Responsibility**: Image asset management and download

**Key Features**:
- Concurrent download with rate limiting (p-queue)
- Image filtering (avatars, testimonials, user images)
- WordPress-friendly naming and organization
- Image mapping for URL updates
- Format validation

**Input**: HTML files from scraping step
**Output**: 
- Downloaded images in `output/images/`
- Image mapping file for URL updates

**Key Methods**:
- `extractImages(html)` - Extracts image URLs from HTML
- `downloadImage(url)` - Downloads a single image
- `downloadAll(images)` - Downloads all images concurrently

**Error Handling**: Custom `ImageDownloadError` class with retry mechanism

### ContentProcessorService (`src/core/processor.js`)

**Responsibility**: HTML sanitization and WordPress preparation

**Key Features**:
- **Aggressive cleaning**: Removes ALL classes and IDs (except Bootstrap layout classes)
- **Bootstrap preservation**: Preserves Bootstrap layout classes for responsive design
- **Custom element removal**: User-specified CSS selectors for targeted removal
- Style preservation for formatting
- Link canonicalization and internal link conversion
- Content spacing normalization (20pt margins)
- Microsoft Word list conversion
- Blog element removal (navigation, dates, sidebar)

**Input**: Raw HTML from scraping step
**Output**: Clean HTML in `output/clean-content/`

**Key Methods**:
- `process(html, options)` - Main processing method
- `_cleanElement(element)` - Element sanitization
- `_shouldPreserveClass(className)` - Bootstrap class detection
- `_updateLinks(element)` - Link URL updates
- `_normalizeSpacing(element)` - Content spacing

**Error Handling**: Custom `ProcessingError` class

### CSVGeneratorService (`src/core/csv-generator.js`)

**Responsibility**: WordPress CSV generation for Really Simple CSV Importer

**Key Features**:
- Really Simple CSV Importer v1.3+ compatibility
- Slug generation from URLs
- Title extraction and cleaning
- Post metadata generation
- Automatic post type detection (post vs page)
- Article date extraction from content
- Proper CSV escaping and quoting

**Input**: Processed HTML files
**Output**: WordPress CSV in `output/wp-ready/`

**Key Methods**:
- `generate(htmlFiles)` - Generates CSV from HTML files
- `_detectContentType(html, url)` - Detects post vs page
- `_extractTitle(html)` - Extracts page title
- `_extractDate(html)` - Extracts publish date
- `_generateSlug(url)` - Creates WordPress slug

**Error Handling**: Custom `CSVGenerationError` class

## Data Architecture

### Data Flow Pipeline

```
1. Input Phase
   └── data/urls.txt
       └── List of URLs to scrape (one per line)

2. Scraping Phase
   └── HTMLScraperService
       └── output/scraped-content/*.html
           └── Raw HTML files with original structure

3. Image Processing Phase (Optional)
   └── ImageDownloaderService
       ├── output/images/{year}/{month}/{filename}
       └── output/images/image-mapping.json
           └── URL to local file mapping

4. Content Processing Phase
   └── ContentProcessorService
       └── output/clean-content/*.html
           └── Sanitized HTML ready for WordPress

5. CSV Generation Phase
   └── CSVGeneratorService
       └── output/wp-ready/wordpress-import.csv
           └── WordPress import file
```

### Configuration Data

**Files**:
- `data/custom-selectors.json` - Content type detection rules
- `data/url-mappings.json` - URL to WordPress slug mappings
- `.env` (optional) - Environment variable overrides

**Runtime Configuration**:
- `src/config/index.js` - Centralized configuration class
- Default values with environment variable override

### Output Data Structure

```
output/
├── scraped-content/          # Raw HTML files
│   └── {domain}_{path}.html
├── images/                   # Downloaded images
│   ├── {year}/
│   │   └── {month}/
│   │       └── {filename}
│   └── image-mapping.json    # URL mappings
├── clean-content/            # Processed HTML
│   └── {domain}_{path}.html
└── wp-ready/                 # WordPress import
    └── wordpress-import.csv
```

## Error Handling Architecture

### Error Class Hierarchy

```
Error (base)
├── ScraperError
│   └── For web scraping failures
├── ImageDownloadError
│   └── For image download failures
├── ProcessingError
│   └── For content processing failures
└── CSVGenerationError
    └── For CSV generation failures
```

### Error Handling Flow

1. **Error Occurs**: Service throws custom error with context
2. **Error Capture**: `handleError()` function captures error
3. **Logging**: Winston logger writes to `logs/error.log` and `logs/combined.log`
4. **User Feedback**: User-friendly message generated via `getUserFriendlyMessage()`
5. **Retry Logic**: Retry mechanism with exponential backoff (where applicable)
6. **Graceful Degradation**: Pipeline continues with other items on failure

### Retry Strategy

- **Exponential Backoff**: Increasing delays between retries
- **Max Retries**: Configurable (default: 2-3 attempts)
- **Circuit Breaker**: Stops retrying after consecutive failures
- **Progress Tracking**: Failed items tracked for final summary

## Configuration Architecture

### Configuration Hierarchy

1. **Default Values**: Defined in `src/config/index.js` `DEFAULTS` object
2. **Environment Variables**: Override defaults via `.env` file or process.env
3. **Runtime Options**: Constructor options override config for specific instances

### Configuration Sections

```javascript
{
  scraper: {      // Web scraping settings
    headless, timeout, maxRetries, concurrency, etc.
  },
  images: {       // Image processing settings
    enabled, maxConcurrent, timeout, retryAttempts, etc.
  },
  processor: {    // Content processing settings
    inputDir, outputDir, imageDir, etc.
  },
  csv: {          // CSV generation settings
    inputDir, outputDir, outputFile, etc.
  },
  data: {         // Data file paths
    urlsFile, contentTypeMappings, urlMappings
  }
}
```

### Configuration Access Pattern

```javascript
import config from '../config/index.js';

// Get configuration section
const scraperConfig = config.get('scraper');

// Use in service constructor
const service = new HTMLScraperService(config.get('scraper'));
```

## Pipeline Orchestration

### Main Pipeline Flow (`automation.js`)

```javascript
async run() {
  1. User prompts for image processing preference
  2. Get content type selectors (posts vs pages)
  3. Display pipeline information
  4. Run scraping step (HTMLScraperService)
  5. Run image processing step (ImageDownloaderService) - conditional
  6. Run content processing step (ContentProcessorService)
  7. Run CSV generation step (CSVGeneratorService)
  8. Display final summary with success/failure counts
}
```

### Sequential Processing Strategy

- **URLs**: Processed sequentially (concurrency = 1) to prevent overwhelming servers
- **Images**: Processed concurrently with rate limiting (default: 5 concurrent)
- **Files**: Processed sequentially for predictable memory usage

## Integration Points

### Service Integration

Services integrate through:
1. **File System**: Services read/write files in `output/` directory
2. **Configuration**: Shared configuration via `config/index.js`
3. **Utilities**: Shared utilities via `utils/` directory
4. **Error Handling**: Common error handling via `utils/errors.js`

### External Dependencies

- **Playwright**: Browser automation (installed separately)
- **WordPress**: Target platform for CSV import
- **Really Simple CSV Importer**: WordPress plugin for CSV import

## Scalability Considerations

### Current Limitations

- Sequential URL processing (single-threaded scraping)
- In-memory HTML processing (memory constraints for very large files)
- No distributed processing support

### Optimization Opportunities

- Batch URL processing for large URL lists
- Streaming for very large HTML files
- Parallel scraping with configurable concurrency
- Caching for repeated scrapes

## Security Considerations

### Input Validation

- URL validation before scraping
- File path sanitization
- Image URL validation
- HTML sanitization to prevent XSS

### Resource Management

- Timeout configuration prevents hanging operations
- Retry limits prevent infinite loops
- Memory-efficient processing for large datasets

### Access Control

- No authentication/authorization (local CLI tool)
- File system permissions respected
- No network server (no exposed ports)

## Development Workflow

See [Development Guide](./development-guide.md) for complete development instructions.

### Key Development Patterns

1. **Service Development**: Add new services to `src/core/` as classes
2. **Utility Development**: Add shared utilities to `src/utils/`
3. **Configuration**: Update `src/config/index.js` for new settings
4. **CLI Commands**: Add new commands to `src/cli/`

### Testing Strategy (Future)

- Unit tests for individual services
- Integration tests for pipeline
- End-to-end tests with sample URLs
- Mock external dependencies (Playwright, file system)

## Architecture Decisions

### Why Playwright over Puppeteer/Selenium?

- Better Cloudflare bypass capabilities
- Modern API and better documentation
- Active maintenance and community support

### Why Service-Oriented Architecture?

- Easy to test individual services
- Can be used independently or as pipeline
- Clear separation of concerns
- Easy to extend with new services

### Why Sequential URL Processing?

- Prevents overwhelming target servers
- Better progress tracking
- Simpler error handling
- Respects server rate limits

### Why JSDOM and Cheerio?

- JSDOM for complex DOM manipulation (complete DOM implementation)
- Cheerio for simple parsing (lightweight, jQuery-like API)
- Both serve different use cases in the pipeline

