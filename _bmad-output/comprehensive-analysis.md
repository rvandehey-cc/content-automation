# Comprehensive Project Analysis

## Configuration Management

### Configuration Files
- **Location**: `src/config/index.js`
- **Method**: Centralized configuration class with environment variable support
- **Environment Variables**: Loaded via `dotenv` package
- **Configuration Sections**:
  - Scraper configuration (timeouts, retries, concurrency)
  - Image processing configuration (enabled, max concurrent, timeouts)
  - Content processor configuration (input/output directories)
  - CSV generator configuration (WordPress import format)
  - Data file paths (URLs, selectors, mappings)

### Environment Variable Support
- Configuration can be overridden via `.env` file (not tracked in repo)
- Supported variables: `SCRAPER_*`, `IMAGES_*`, `PROCESSOR_*`, `LOG_LEVEL`, `NODE_ENV`

### Configuration Pattern
- Service-based configuration injection via constructor options
- Default values defined in `DEFAULTS` object
- Runtime configuration via `config.get(section)` method

## Entry Points

### Primary Entry Point
- **File**: `src/cli/automation.js`
- **Shebang**: `#!/usr/bin/env node` (executable script)
- **Main Function**: `ContentAutomationPipeline.run()`
- **Script Command**: `npm start` → `node src/cli/automation.js`

### Secondary Entry Points (Standalone Services)
- `src/cli/processor.js` - Content processing only
- `src/cli/cleanup.js` - Cleanup utilities
- Individual services can be imported and used programmatically

### Service Entry Points
- All core services are exportable classes:
  - `HTMLScraperService` from `src/core/scraper.js`
  - `ImageDownloaderService` from `src/core/image-downloader.js`
  - `ContentProcessorService` from `src/core/processor.js`
  - `CSVGeneratorService` from `src/core/csv-generator.js`

## Shared Code Patterns

### Utility Layer (`src/utils/`)
1. **cli.js**: Command-line interface helpers
   - Progress bars, tables, prompts
   - User interaction utilities
   - Display formatting

2. **errors.js**: Error handling and retry logic
   - Custom error classes: `ScraperError`, `ImageDownloadError`, `ProcessingError`, `CSVGenerationError`
   - Centralized error handler: `handleError()`
   - Retry mechanism with exponential backoff: `retry()`
   - Progress tracking: `ProgressTracker` class
   - Winston logger integration

3. **filesystem.js**: File system operations
   - `ensureDir()` - Directory creation
   - `exists()` - File/directory existence check
   - `readJSON()` / `writeJSON()` - Safe JSON operations
   - `readFile()` - Safe file reading
   - `getFiles()` - Pattern-based file discovery

### Configuration Layer (`src/config/`)
- Centralized configuration management
- Environment variable integration
- Service-specific configuration sections
- Path resolution utilities

### Code Patterns
- **ES6 Modules**: All files use `import/export`
- **Async/Await**: Promises throughout
- **Class-based Architecture**: Services as classes with constructor injection
- **Error Handling**: Comprehensive try-catch with custom error types
- **Progress Tracking**: Real-time feedback for long operations

## Test Patterns

### Current Status
- **Tests**: Not implemented (test script placeholder exists)
- **Test Script**: `npm test` → placeholder message
- **Test Framework**: Not yet selected
- **Test Patterns Expected**: 
  - Unit tests: `*.test.js` or `*.spec.js`
  - Test directory: `tests/` (referenced in package.json but not yet created)

### Test File Patterns (for future implementation)
- `*.test.ts` / `*.test.js`
- `*.spec.ts` / `*.spec.js`
- `**/__tests__/**`

## CI/CD Patterns

### Current Status
- **CI/CD**: Not configured
- **GitHub Actions**: No workflows found
- **GitLab CI**: No `.gitlab-ci.yml` found
- **Deployment**: Manual execution via CLI

### Future CI/CD Considerations
- Automated testing on commits
- Browser installation for Playwright
- Environment variable management
- Artifact generation for output files

## Code Organization Patterns

### Service Layer Structure
```
src/core/
├── scraper.js          # HTMLScraperService - Web scraping
├── image-downloader.js # ImageDownloaderService - Image management
├── processor.js        # ContentProcessorService - HTML sanitization
└── csv-generator.js    # CSVGeneratorService - WordPress CSV generation
```

### Service Characteristics
- Each service is a class with constructor injection
- Services accept configuration via `options` parameter
- Services use centralized config with `config.get(section)`
- Services handle their own error types
- Services use shared utilities (errors, filesystem)

### Data Flow Pattern
1. **Input**: URLs from `data/urls.txt`
2. **Processing Pipeline**:
   - HTMLScraperService → Raw HTML files
   - ImageDownloaderService → Downloaded images + mapping
   - ContentProcessorService → Cleaned HTML
   - CSVGeneratorService → WordPress-ready CSV
3. **Output**: Files in `output/` directory structure

## Error Handling Patterns

### Custom Error Classes
- Domain-specific error types with context
- Error chaining via `cause` property
- User-friendly message generation

### Retry Logic
- Exponential backoff for transient failures
- Configurable max retries
- Circuit breaker pattern for consecutive failures

### Logging
- Winston logger with file transports
- Structured logging with context
- Console output in development mode
- Separate error and combined logs

## Processing Patterns

### Sequential Processing
- URLs processed sequentially (concurrency = 1)
- Prevents overwhelming target servers
- Provides better progress tracking

### Concurrent Image Downloads
- Configurable concurrency (default: 5)
- Rate limiting via p-queue
- Progress tracking per download

### Memory Efficiency
- Streaming file operations where possible
- Large file handling considerations
- Progress tracking for memory-intensive operations

