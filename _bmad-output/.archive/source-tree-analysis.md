# Source Tree Analysis

## Project Directory Structure

```
headless-scrape/
├── _bmad-output/                    # BMAD workflow outputs (documentation generation)
│   ├── analysis/                    # Analysis artifacts
│   ├── comprehensive-analysis.md    # Detailed project analysis
│   ├── project-scan-report.json     # Workflow state tracking
│   └── technology-stack.md          # Technology stack documentation
│
├── data/                            # Configuration and input data
│   ├── custom-selectors.json        # Content type detection rules (post vs page)
│   ├── url-mappings.json            # URL to WordPress slug mappings
│   └── urls.txt                     # URLs to scrape (one per line)
│
├── logs/                            # Application logs
│   ├── combined.log                 # All application logs
│   └── error.log                    # Error logs only
│
├── output/                          # Generated content (gitignored)
│   ├── scraped-content/             # Raw HTML files from scraper
│   ├── clean-content/               # Processed/sanitized HTML
│   ├── images/                      # Downloaded images with WordPress paths
│   └── wp-ready/                    # WordPress import CSV files
│
├── src/                             # Source code (main codebase)
│   ├── cli/                         # Command-line interfaces
│   │   ├── automation.js            # 🎯 MAIN ENTRY POINT - Full pipeline orchestrator
│   │   ├── cleanup.js               # Cleanup utilities for output directories
│   │   └── processor.js             # Standalone content processor CLI
│   │
│   ├── config/                      # Configuration management
│   │   └── index.js                 # Centralized configuration class
│   │
│   ├── core/                        # Business logic services (service layer)
│   │   ├── scraper.js               # HTMLScraperService - Web scraping with Playwright
│   │   ├── image-downloader.js      # ImageDownloaderService - Image asset management
│   │   ├── processor.js             # ContentProcessorService - HTML sanitization
│   │   └── csv-generator.js         # CSVGeneratorService - WordPress CSV generation
│   │
│   ├── services/                    # Additional services (currently empty)
│   │
│   └── utils/                       # Shared utilities
│       ├── cli.js                   # CLI helpers (progress bars, tables, prompts)
│       ├── errors.js                # Error handling, retry logic, logging
│       └── filesystem.js            # File system operations
│
├── package.json                     # Node.js project manifest
├── package-lock.json                # Dependency lock file
└── README.md                        # Project documentation
```

## Critical Directories Explained

### `src/cli/` - Command-Line Interface Layer
**Purpose**: User-facing CLI applications and orchestration
- **automation.js**: Main entry point that orchestrates the complete pipeline
- **cleanup.js**: Maintenance utilities for cleaning output directories
- **processor.js**: Standalone processor for processing already-scraped content

**Key Characteristics**:
- Interactive user prompts for configuration
- Progress tracking and display
- Pipeline orchestration logic
- Error handling and user feedback

### `src/core/` - Core Services Layer
**Purpose**: Business logic services with single responsibilities
- **scraper.js**: Web scraping using Playwright (Cloudflare bypass, retry logic)
- **image-downloader.js**: Image extraction, downloading, and WordPress path mapping
- **processor.js**: HTML sanitization, link updates, Bootstrap class preservation
- **csv-generator.js**: WordPress CSV generation for Really Simple CSV Importer plugin

**Key Characteristics**:
- Class-based service architecture
- Constructor dependency injection
- Configuration-driven behavior
- Comprehensive error handling
- Progress tracking integration

### `src/utils/` - Utility Layer
**Purpose**: Shared utilities used across services
- **cli.js**: Terminal UI components (progress bars, tables, user prompts)
- **errors.js**: Custom error classes, retry mechanisms, Winston logger integration
- **filesystem.js**: Safe file operations (JSON read/write, directory management)

**Key Characteristics**:
- Pure utility functions
- No side effects (except file operations)
- Used by all service layers
- Reusable across the codebase

### `src/config/` - Configuration Layer
**Purpose**: Centralized configuration management
- **index.js**: Configuration class with environment variable support

**Key Characteristics**:
- Single source of truth for configuration
- Environment variable integration via dotenv
- Default values for all settings
- Service-specific configuration sections

### `data/` - Data and Configuration Files
**Purpose**: Input data and runtime configuration
- **urls.txt**: Source URLs for scraping (one per line)
- **custom-selectors.json**: CSS selectors for post/page content type detection
- **url-mappings.json**: Custom URL to WordPress slug mappings

**Key Characteristics**:
- User-editable input files
- JSON configuration for rules
- Plain text for URL lists

### `output/` - Generated Content (Gitignored)
**Purpose**: Pipeline output files
- **scraped-content/**: Raw HTML files from web scraping
- **clean-content/**: Sanitized HTML ready for WordPress
- **images/**: Downloaded images with WordPress-friendly organization
- **wp-ready/**: WordPress import CSV files

**Key Characteristics**:
- Generated by pipeline execution
- Not committed to version control
- Organized by processing stage
- Can be cleaned via cleanup utilities

## Entry Points

### Primary Entry Point
- **File**: `src/cli/automation.js`
- **Command**: `npm start` → `node src/cli/automation.js`
- **Shebang**: `#!/usr/bin/env node` (executable)
- **Purpose**: Complete automation pipeline orchestration

### Secondary Entry Points
- **processor.js**: Standalone content processing (`npm run process`)
- **cleanup.js**: Cleanup utilities (`npm run clean`)

### Programmatic Entry Points
All core services are exportable classes and can be imported:
```javascript
import { HTMLScraperService } from './src/core/scraper.js';
import { ContentProcessorService } from './src/core/processor.js';
// ... etc
```

## Key File Locations

### Configuration
- **Main Config**: `src/config/index.js`
- **Package Config**: `package.json`
- **Runtime Config**: `.env` (optional, not tracked)

### Data Files
- **URLs**: `data/urls.txt`
- **Selectors**: `data/custom-selectors.json`
- **Mappings**: `data/url-mappings.json`

### Logs
- **All Logs**: `logs/combined.log`
- **Errors Only**: `logs/error.log`

### Service Implementations
- **Scraping**: `src/core/scraper.js` (HTMLScraperService)
- **Image Processing**: `src/core/image-downloader.js` (ImageDownloaderService)
- **Content Processing**: `src/core/processor.js` (ContentProcessorService)
- **CSV Generation**: `src/core/csv-generator.js` (CSVGeneratorService)

## Directory Purpose Summary

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `src/cli/` | CLI orchestration and user interaction | automation.js (main entry) |
| `src/core/` | Business logic services | All service classes |
| `src/utils/` | Shared utilities | errors.js, filesystem.js, cli.js |
| `src/config/` | Configuration management | index.js |
| `data/` | Input data and configuration | urls.txt, custom-selectors.json |
| `output/` | Generated pipeline outputs | scraped-content/, clean-content/, wp-ready/ |
| `logs/` | Application logging | combined.log, error.log |

## Architecture Flow

```
Entry Point (automation.js)
    ↓
Orchestration Layer
    ↓
Service Layer (core/)
    ├── HTMLScraperService → Raw HTML
    ├── ImageDownloaderService → Images + Mapping
    ├── ContentProcessorService → Clean HTML
    └── CSVGeneratorService → WordPress CSV
    ↓
Utility Layer (utils/)
    ├── Error Handling
    ├── File System Operations
    └── CLI Helpers
    ↓
Configuration Layer (config/)
    └── Centralized Settings
```

