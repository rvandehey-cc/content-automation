# Development Guide

## Prerequisites
- **Node.js**: Version >= 18.0.0
- **Package Manager**: npm or yarn
- **Browsers**: Playwright browser binaries

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd wp-content-automation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install browser binaries**:
   ```bash
   npm run install-browsers
   ```

## Configuration

Create a `.env` file in the root directory. Key configuration options include:

```env
# Scraper Settings
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=60000

# Processor Settings
DEALER_SLUG=my-dealership
IMAGE_YEAR=2024
IMAGE_MONTH=01

# Input Files
URLS_FILE=data/urls.txt
```

Refer to `src/config/index.js` for a full list of available settings and defaults.

## Usage

### Running the Full Pipeline
The primary entry point executes the complete scrape-to-csv workflow:
```bash
npm start
```

### Input Data
Add the URLs you wish to scrape to `data/urls.txt`, one per line. You can optionally specify the content type:
```text
https://example.com/about-us page
https://example.com/blog/article-1 post
```

## Development Workflow

### Coding Standards
- Use ES Modules (`import/export`).
- Follow the service-oriented pattern in `src/core/`.
- Document all core functions with JSDoc.

### Utilities
- Use `src/utils/filesystem.js` for all I/O operations.
- Wrap asynchronous calls in the `retry` utility from `src/utils/errors.js` if they involve network or volatile operations.

## Troubleshooting
- **Cloudflare Blocks**: If sites block headless access, try setting `SCRAPER_HEADLESS=false` to debug visually or update the `userAgent` in config.
- **Missing Images**: Check `output/images/image-mapping.json` to verify if images were successfully detected and downloaded.
- **CSS Issues**: If too much CSS is removed, update the `_shouldPreserveClass` whitelist in `src/core/processor.js`.
