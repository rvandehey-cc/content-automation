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

### 1. Environment Variables
Copy `.env.example` to `.env` and configure the following:
- **CLI Settings**: `USER_NAME`, `TARGET_URLS_FILE`.
- **Database**: `DATABASE_URL` (Supabase connection string).
- **Web UI**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 2. Database Setup
The project uses Supabase for persistence and Prisma as the ORM.
1. **Docker**: Start the Redis container for BullMQ: `npm run docker:up`.
2. **Migrations**: Apply database migrations: `npm run db:migrate`.
3. **Prisma Client**: Generate the type-safe client: `npm run db:generate`.

### 3. Web Dashboard Setup
The dashboard is a Next.js 16 application.
1. **Development Server**: `npm run dev:web`.
2. **First-time User**: Access `/auth/signup` to create your management account.

---

## Execution Modes

### 1. Web-First (Recommended)
Launch the dashboard (`npm run dev:web`) to manage site profiles and trigger scraping jobs from the UI. This provides the best observability via real-time logs and metrics.

### 2. CLI-Only (Legacy/Automated)
Run the core automation directly from the terminal:
```bash
npm start
```
This will process the URLs listed in `data/urls.txt` using the default configuration.

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
