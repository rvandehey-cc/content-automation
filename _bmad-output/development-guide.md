# Development Guide

## Prerequisites

### Required Software
- **Node.js**: >=18.0.0 (see package.json engines requirement)
- **npm**: Comes with Node.js (typically 9.x+)
- **Chrome/Chromium**: Installed automatically by Playwright

### System Requirements
- **Operating System**: Windows 10+, macOS 10.14+, or Ubuntu 18.04+
- **RAM**: 4GB+ recommended (for processing large content sets)
- **Disk Space**: ~500MB for dependencies + browser binaries

### Node Version Management
The project specifies Node.js >=18.0.0 in package.json. If using nvm:

```bash
# Check current version
node -v

# Install Node.js 24 (latest LTS recommended)
nvm install 24

# Switch to Node 24
nvm use 24
```

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/vande012/wp-content-automation
cd headless-scrape
```

### 2. Install Dependencies
```bash
npm install
```

This will install all production and development dependencies listed in `package.json`.

### 3. Install Playwright Browsers
```bash
npm run install-browsers
```

This installs the Chromium browser required by Playwright for web scraping.

## Environment Setup

### Environment Variables (Optional)

Create a `.env` file in the project root to override default configuration:

```bash
# Scraper Configuration
SCRAPER_HEADLESS=true          # Run browser in headless mode
SCRAPER_TIMEOUT=60000          # Page load timeout (ms)
SCRAPER_MAX_RETRIES=2          # Retry attempts for failed scrapes
SCRAPER_CONCURRENCY=1          # Concurrent URL processing (default: 1)

# Image Processing
IMAGES_ENABLED=true            # Enable image downloading
IMAGES_MAX_CONCURRENT=5        # Concurrent download limit
IMAGES_TIMEOUT=30000           # Image download timeout (ms)
BYPASS_IMAGES=false            # Skip all image processing

# Processing
DEALER_SLUG=your-dealership    # For image path generation
IMAGE_YEAR=2025               # For image organization
IMAGE_MONTH=01                # For image organization

# Logging
LOG_LEVEL=info                # Log level: error, warn, info, debug
NODE_ENV=development          # Environment: development or production
```

**Note**: The `.env` file is optional. Default values will be used if not specified.

## Local Development

### Run Full Pipeline
```bash
npm start
```

Or directly:
```bash
node src/cli/automation.js
```

This runs the complete automation pipeline:
1. HTML scraping from URLs in `data/urls.txt`
2. Image processing (if enabled)
3. Content sanitization
4. WordPress CSV generation

### Development Mode (Enhanced Logging)
```bash
npm run dev
```

Runs with `NODE_ENV=development` for enhanced console logging.

### Individual Service Execution

#### Scraping Only
```bash
npm run scrape
node src/cli/scraper.js
```

#### Processing Only
```bash
npm run process
node src/cli/processor.js
```

Note: Individual service scripts may not be fully implemented. Use the main pipeline (`npm start`) for complete workflows.

## Build Process

### No Build Step Required
This is a Node.js CLI application with no compilation step. The code runs directly via Node.js.

### Code Quality Checks
```bash
npm run lint
```

Runs ESLint to check code quality and style (currently configured but may need ESLint config file).

## Testing

### Current Status
**Tests are not yet implemented.**

The test script exists but only outputs a placeholder message:
```bash
npm test
# Output: "Tests not implemented yet"
```

### Test Framework (Future)
- Test files should use patterns: `*.test.js` or `*.spec.js`
- Expected test directory: `tests/` (referenced in package.json but not created)
- Test framework: Not yet selected

### Recommended Test Structure (Future)
```
tests/
├── unit/
│   ├── core/
│   │   ├── scraper.test.js
│   │   ├── processor.test.js
│   │   └── csv-generator.test.js
│   └── utils/
│       ├── errors.test.js
│       └── filesystem.test.js
├── integration/
│   └── pipeline.test.js
└── fixtures/
    └── sample-data/
```

## Common Development Tasks

### Adding New URLs to Scrape
1. Edit `data/urls.txt`
2. Add one URL per line
3. Run `npm start`

### Updating Content Type Selectors
1. Edit `data/custom-selectors.json`
2. Update post/page class selectors
3. Or provide new selectors during pipeline execution prompts

### Customizing Link Mappings
1. Edit `data/url-mappings.json`
2. Add URL patterns and WordPress slug mappings
3. Used during content processing for link updates

### Cleaning Output Directories
```bash
npm run clean
node src/cli/cleanup.js
```

Removes all generated content from `output/` directory.

### Viewing Logs
- **All logs**: `logs/combined.log`
- **Errors only**: `logs/error.log`

Logs are managed by Winston logger and include timestamps and context.

## Development Workflow

### Typical Development Cycle

1. **Edit source code** in `src/` directory
2. **Test changes** by running:
   ```bash
   npm start  # or npm run dev for enhanced logging
   ```
3. **Check logs** for any errors:
   ```bash
   tail -f logs/combined.log
   ```
4. **Verify output** in `output/` directory
5. **Clean outputs** when needed:
   ```bash
   npm run clean
   ```

### Code Structure Guidelines

- **Services**: Add new services to `src/core/` as classes
- **Utilities**: Add shared utilities to `src/utils/`
- **CLI Commands**: Add new CLI commands to `src/cli/`
- **Configuration**: Update `src/config/index.js` for new config sections

### Error Handling Pattern

All services use custom error classes from `src/utils/errors.js`:
- `ScraperError` for scraping failures
- `ImageDownloadError` for image download failures
- `ProcessingError` for content processing failures
- `CSVGenerationError` for CSV generation failures

Use `handleError()` for centralized error handling with logging.

## Deployment

### No Deployment Required
This is a CLI tool that runs locally. There is no web server or deployed application.

### Distribution

The tool can be:
1. **Cloned and run locally**: Standard workflow
2. **Packaged as npm package** (future): Could be published to npm registry
3. **Containerized** (future): Could use Docker for consistent environments

### CI/CD

Currently no CI/CD pipeline configured. For future implementation:

- **GitHub Actions**: No workflows found
- **GitLab CI**: No `.gitlab-ci.yml` found

### Recommended CI/CD Steps (Future)
1. Install Node.js dependencies
2. Run `npm run install-browsers` for Playwright
3. Run `npm test` (when tests are implemented)
4. Run `npm run lint` for code quality
5. Generate artifacts (optional)

## Troubleshooting

### Browser Installation Issues
```bash
# Reinstall browsers
npm run install-browsers

# Or manually via Playwright
npx playwright install chromium
```

### Module Resolution Issues
- Ensure Node.js >=18.0.0
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again

### Permission Issues (macOS/Linux)
```bash
# Make automation.js executable
chmod +x src/cli/automation.js
```

### Logging Issues
- Check `LOG_LEVEL` environment variable
- Verify `logs/` directory exists and is writable
- Check Winston logger configuration in `src/utils/errors.js`

## Performance Considerations

### Memory Usage
- Large HTML files may consume significant memory
- Consider streaming for very large datasets
- Monitor memory usage during long-running operations

### Network Considerations
- Sequential URL processing (concurrency=1) prevents overwhelming servers
- Image downloads use controlled concurrency (default: 5)
- Timeouts configured to prevent hanging requests

### Optimization Tips
- Process URLs in batches if memory constrained
- Adjust `IMAGES_MAX_CONCURRENT` based on network capacity
- Use `BYPASS_IMAGES=true` to skip image processing if not needed

