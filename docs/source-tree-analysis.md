# Source Tree Analysis

## Directory Structure Overview

```
wp-content-automation/
├── src/
│   ├── app/            # Next.js App Router root. Contains all frontend pages and API routes.
│   ├── cli/            # CLI Orchestration Layer
│   │   ├── automation.js # Main pipeline entry point
│   │   ├── scraper.js    # Scraper CLI wrapper
│   │   ├── processor.js  # Processor CLI wrapper
│   │   └── ...
│   ├── components/     # React components. Includes `ui/` (shadcn components) and custom business components like `auth-button.jsx`.
│   ├── core/           # Business Logic Services
│   │   ├── scraper.js    # HTMLScraperService
│   │   ├── image-downloader.js # ImageDownloaderService
│   │   ├── processor.js  # ContentProcessorService
│   │   └── csv-generator.js # CSVGeneratorService
│   ├── config/         # Configuration Management
│   │   └── index.js      # Centralized Config class
│   ├── lib/            # Shared libraries for both CLI and Web. Includes database clients and utility wrappers.
│   │   └── db/         # Connection logic for PostgreSQL and Prisma initialization.
│   ├── utils/          # Shared Utilities
│   │   ├── errors.js     # Error handling and retry logic
│   │   ├── filesystem.js # File/JSON helpers
│   │   └── ...
│   └── middleware.js   # Next.js middleware for route protection (Supabase Auth).
├── data/               # Input Data & Local Config
│   ├── urls.txt        # Target scrape list
│   └── ...
├── output/             # Generated Content (Gitignored)
│   ├── scraped-content/ # Raw HTML from scraper
│   ├── images/         # Downloaded assets
│   ├── clean-content/  # Sanitized HTML
│   └── wp-ready/       # Final import CSVs
├── wp-metadata-helper.js # Client-side helper (Bookmarklet)
├── wp-bulk-alt-fixer.js  # Bulk Alt Text utility
└── README.md           # Main project README
```

## Critical Components

### 1. The Core Services (`src/core/`)
- **HTMLScraperService**: The "eye" of the project. Uses Playwright to navigate websites, handle dynamic content, and extract raw HTML based on configured selectors.
- **ContentProcessorService**: The "filter". Sanitizes HTML by removing IDs/classes while preserving Bootstrap structure. Normalizes links and maps image sources.
- **ImageDownloaderService**: The "asset manager". Fetches remote images, manages local storage, and generates mapping data for the processor.
- **CSVGeneratorService**: The "exporter". Packages processed content into the final CSV format required for WordPress import.

### 2. Configuration (`src/config/`)
- Uses a singleton pattern to provide consistent access to environment variables (`.env`) and default settings across the entire application.

### 3. CLI Orchestration (`src/cli/`)
- `automation.js` acts as the main controller, wiring the services together into a deterministic multi-step pipeline.
