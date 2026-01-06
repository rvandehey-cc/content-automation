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

## Configuration & Setup

### 1. Primary Setup Guide
All project configuration, environment variables, and database setup instructions have been consolidated into the root **[README.md](../README.md)**. Use that file as the single source of truth for:
- Database Configuration (Supabase & Prisma)
- Redis / Docker Setup
- Environment Variable reference
- Web Dashboard and CLI execution commands

### 2. Quick Execution Reference
- **Development Server**: `npm run dev:web`
- **Automation CLI**: `npm start`
- **Database Migrations**: `npm run db:migrate`
- **Database Visualizer**: `npm run db:studio`

---

## Execution Modes

### 1. Web-First (Unified Dashboard)
Launch the dashboard to manage site profiles, trigger scraping jobs, and track metrics with real-time feedback.

### 2. CLI-Only (Direct Automation)
Run the core automation directly from the terminal for batch processing or legacy compatibility.
```bash
npm start
```

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
