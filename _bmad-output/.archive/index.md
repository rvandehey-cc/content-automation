# Project Documentation Index

## Project Overview

- **Type**: Monolith CLI Tool
- **Primary Language**: JavaScript (Node.js >=18.0.0)
- **Architecture**: Service-Oriented Layered Architecture
- **Project Name**: wp-content-automation (content automation pipeline)

## Quick Reference

### Tech Stack Summary
- **Runtime**: Node.js >=18.0.0
- **Browser Automation**: Playwright ^1.40.0
- **DOM Manipulation**: JSDOM ^23.2.0, Cheerio ^1.0.0-rc.12
- **Logging**: Winston ^3.11.0
- **Architecture Pattern**: Service-Oriented Layered Architecture

### Entry Point
- **Main Script**: `src/cli/automation.js`
- **Command**: `npm start`
- **Root Path**: `/Users/ryanvandehey/Desktop/content-automation/wp-content-automation`

### Architecture Pattern
Service-Oriented Layered Architecture with:
- CLI Layer (orchestration)
- Service Layer (business logic)
- Utility Layer (shared functionality)
- Configuration Layer (settings management)

## Generated Documentation

### Core Documentation Files

1. **[Project Overview](./project-overview.md)**
   - Executive summary and project information
   - Technology stack summary
   - Quick reference and getting started

2. **[Architecture Documentation](./architecture.md)**
   - Complete system architecture
   - Service architecture details
   - Data architecture and flow
   - Error handling architecture
   - Configuration architecture
   - Pipeline orchestration

3. **[Source Tree Analysis](./source-tree-analysis.md)**
   - Annotated directory structure
   - Critical directories explained
   - Entry points documented
   - Key file locations
   - Architecture flow diagram

4. **[Development Guide](./development-guide.md)**
   - Prerequisites and installation
   - Environment setup
   - Local development instructions
   - Build process
   - Testing (future)
   - Common development tasks
   - Deployment information

5. **[Technology Stack](./technology-stack.md)**
   - Complete technology stack table
   - Core dependencies
   - Development dependencies
   - Architecture pattern explanation
   - Framework and library choices

6. **[Comprehensive Analysis](./comprehensive-analysis.md)**
   - Configuration management
   - Entry points
   - Shared code patterns
   - Test patterns
   - CI/CD patterns
   - Code organization patterns
   - Error handling patterns
   - Processing patterns

### Supporting Files

- **[Project Scan Report](./project-scan-report.json)**: Workflow execution state and progress tracking

## Existing Documentation

### Project Documentation

1. **[README.md](../README.md)** (704 lines)
   - Comprehensive project documentation
   - Complete usage instructions
   - Configuration details
   - Troubleshooting guide
   - Expansion and customization guide

## Getting Started

### Quick Start for Developers

1. **Prerequisites**
   ```bash
   node -v  # Should be >=18.0.0
   ```

2. **Installation**
   ```bash
   npm install
   npm run install-browsers
   ```

3. **Run Pipeline**
   ```bash
   npm start
   ```

4. **Add URLs**
   - Edit `data/urls.txt` with URLs to scrape

5. **Output**
   - Generated CSV: `output/wp-ready/wordpress-import.csv`

### Quick Start for AI-Assisted Development

When working on this project:

1. **Read Architecture First**: Start with [Architecture Documentation](./architecture.md) to understand system design
2. **Review Source Tree**: See [Source Tree Analysis](./source-tree-analysis.md) for file locations
3. **Check Development Guide**: See [Development Guide](./development-guide.md) for setup and workflow
4. **Understand Services**: Review service implementations in `src/core/` directory
5. **Configuration**: Check `src/config/index.js` for available settings

## Project Structure Summary

```
wp-content-automation/
├── src/
│   ├── cli/          # CLI interfaces (automation.js is main entry)
│   ├── core/         # Business logic services
│   ├── utils/        # Shared utilities
│   └── config/       # Configuration management
├── data/             # Input data and configuration
├── output/           # Generated content (gitignored)
├── logs/             # Application logs
└── README.md         # Main project documentation
```

## Service Overview

### Core Services

1. **HTMLScraperService** (`src/core/scraper.js`)
   - Web scraping with Playwright
   - Cloudflare bypass
   - Retry mechanisms

2. **ImageDownloaderService** (`src/core/image-downloader.js`)
   - Image downloading and organization
   - WordPress path mapping

3. **ContentProcessorService** (`src/core/processor.js`)
   - HTML sanitization
   - Bootstrap class preservation
   - Link updates

4. **CSVGeneratorService** (`src/core/csv-generator.js`)
   - WordPress CSV generation
   - Content type detection
   - Slug generation

## Data Flow

```
URLs (data/urls.txt)
  ↓
HTMLScraperService → Raw HTML (output/scraped-content/)
  ↓
ImageDownloaderService → Images (output/images/)
  ↓
ContentProcessorService → Clean HTML (output/clean-content/)
  ↓
CSVGeneratorService → WordPress CSV (output/wp-ready/)
```

## Key Configuration Files

- **Main Config**: `src/config/index.js`
- **Package Config**: `package.json`
- **Data Files**: `data/urls.txt`, `data/custom-selectors.json`, `data/url-mappings.json`
- **Environment**: `.env` (optional, not tracked)

## Important Notes

⚠️ **Customization Required**: This system was initially developed for automotive dealership websites and requires customization for different dealer groups, OEMs, or other industries.

See [README.md](../README.md) "Expansion & Customization" section for details.

## Documentation Navigation

### For Architecture Understanding
1. Read [Architecture Documentation](./architecture.md)
2. Review [Source Tree Analysis](./source-tree-analysis.md)
3. Check [Comprehensive Analysis](./comprehensive-analysis.md)

### For Development
1. Start with [Development Guide](./development-guide.md)
2. Review [Technology Stack](./technology-stack.md)
3. Check existing [README.md](../README.md)

### For Understanding Services
1. Review [Architecture Documentation](./architecture.md) - Service Architecture section
2. Check source code in `src/core/` directory
3. Review [Comprehensive Analysis](./comprehensive-analysis.md) - Code Organization section

### For Configuration
1. See [Architecture Documentation](./architecture.md) - Configuration Architecture section
2. Check `src/config/index.js` source code
3. Review [Development Guide](./development-guide.md) - Environment Setup section

---

**Generated**: 2025-12-19  
**Workflow Version**: 1.2.0  
**Scan Level**: Deep  
**Mode**: Initial Scan

