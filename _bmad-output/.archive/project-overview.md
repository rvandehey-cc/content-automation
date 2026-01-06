# Project Overview

## Project Information

- **Project Name**: headless-scrape (headless-scraper)
- **Version**: 2.0.0
- **Type**: CLI Tool (Command-Line Interface)
- **Repository Type**: Monolith (single cohesive codebase)
- **Primary Language**: JavaScript (Node.js)
- **License**: MIT
- **Author**: Content Automation Team / Ryan Vandehey

## Purpose

A robust, enterprise-grade content automation system that scrapes web content and prepares it for WordPress import. Built with modern JavaScript and designed for scalability, maintainability, and ease of use.

**Originally built for**: Ford dealership websites, but extensible to other dealer groups and OEMs.

## Executive Summary

This system automates the entire process of extracting content from websites and preparing it for WordPress import, including:

- Web scraping with Cloudflare bypass capabilities
- Content sanitization and HTML cleaning
- Image downloading and organization
- WordPress-ready CSV file generation
- Intelligent content type detection (posts vs pages)

## Technology Stack Summary

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js >=18.0.0 |
| **Module System** | ES6 Modules |
| **Browser Automation** | Playwright ^1.40.0 |
| **DOM Manipulation** | JSDOM ^23.2.0, Cheerio ^1.0.0-rc.12 |
| **Logging** | Winston ^3.11.0 |
| **HTTP Client** | node-fetch ^3.3.2 |
| **Concurrency** | p-queue ^7.4.1 |

See [Technology Stack](./technology-stack.md) for complete details.

## Architecture Type

**Service-Oriented Layered Architecture**

The project follows a clean layered architecture with service-based organization:

- **CLI Layer**: User interface and pipeline orchestration
- **Service Layer**: Business logic services (scraper, processor, CSV generator, image downloader)
- **Utility Layer**: Shared utilities (errors, filesystem, CLI helpers)
- **Configuration Layer**: Centralized configuration management

See [Architecture Documentation](./architecture.md) for complete architecture details.

## Repository Structure

**Monolith** - Single cohesive codebase with clear module separation:

```
src/
├── cli/          # CLI interfaces and orchestration
├── core/         # Business logic services
├── utils/        # Shared utilities
└── config/       # Configuration management
```

See [Source Tree Analysis](./source-tree-analysis.md) for complete directory structure.

## Key Features

### 1. Robust Web Scraping
- Uses Playwright for headless browsing
- Handles Cloudflare protection bypass
- Retry mechanisms with exponential backoff
- Sequential URL processing to prevent server overwhelming

### 2. Intelligent Content Cleaning
- Removes unwanted attributes, classes, and IDs
- Preserves Bootstrap layout classes for responsive design
- Custom element removal via CSS selectors
- Blog template element removal (navigation, dates, sidebar)

### 3. Smart Link Processing
- Converts internal links to WordPress-friendly URLs
- Custom URL mapping support
- Link canonicalization

### 4. Image Management
- Concurrent download with rate limiting
- WordPress-friendly naming and organization
- Image mapping for URL updates
- Automatic filtering of avatars and testimonials

### 5. Content Type Detection
- Automatically classifies content as posts or pages
- Custom selector-based detection
- URL pattern analysis
- Fallback rules for uncertain content

### 6. WordPress Integration
- Generates CSV files compatible with Really Simple CSV Importer plugin
- Automatic slug generation from URLs
- Post metadata generation
- Article date extraction

## Project Classification

- **Project Type**: CLI (Command-Line Tool)
- **Primary Use Case**: Web scraping and content automation
- **Target Platform**: WordPress (via CSV import)
- **Deployment Model**: Local CLI execution (no server deployment)

## Quick Reference

### Entry Point
- **Main Script**: `src/cli/automation.js`
- **Command**: `npm start`

### Key Files
- **Configuration**: `src/config/index.js`
- **Data Input**: `data/urls.txt`
- **Output**: `output/wp-ready/wordpress-import.csv`

### Documentation
- **Complete Documentation**: [README.md](../README.md)
- **Architecture**: [Architecture Documentation](./architecture.md)
- **Development**: [Development Guide](./development-guide.md)
- **Technology**: [Technology Stack](./technology-stack.md)

## Getting Started

### Quick Start
1. **Install dependencies**: `npm install`
2. **Install browsers**: `npm run install-browsers`
3. **Add URLs**: Edit `data/urls.txt`
4. **Run pipeline**: `npm start`
5. **Import to WordPress**: Use generated CSV in `output/wp-ready/`

### Prerequisites
- Node.js >=18.0.0
- npm (comes with Node.js)
- Chrome/Chromium (installed by Playwright)

See [Development Guide](./development-guide.md) for complete setup instructions.

## Workflow Overview

```
1. Input: URLs from data/urls.txt
   ↓
2. HTML Scraping: Playwright scrapes content
   ↓
3. Image Processing (optional): Download and organize images
   ↓
4. Content Processing: Sanitize and clean HTML
   ↓
5. CSV Generation: Create WordPress import file
   ↓
6. Output: wordpress-import.csv ready for import
```

## Links to Detailed Documentation

### Core Documentation
- **[Architecture](./architecture.md)**: Complete system architecture and design decisions
- **[Development Guide](./development-guide.md)**: Setup, development, and operational instructions
- **[Source Tree Analysis](./source-tree-analysis.md)**: Annotated directory structure
- **[Technology Stack](./technology-stack.md)**: Complete technology stack details
- **[Comprehensive Analysis](./comprehensive-analysis.md)**: Detailed code patterns and analysis

### Project Documentation
- **[README.md](../README.md)**: Main project documentation (704 lines)

### Workflow State
- **[Project Scan Report](./project-scan-report.json)**: Workflow execution state and progress tracking

## Current Status

### Implemented
- ✅ Complete pipeline (scraping → processing → CSV generation)
- ✅ Image download and management
- ✅ Content sanitization with Bootstrap preservation
- ✅ WordPress CSV generation
- ✅ Error handling and retry logic
- ✅ Progress tracking and logging

### Not Implemented
- ❌ Automated testing (test framework not yet selected)
- ❌ CI/CD pipeline
- ❌ Package distribution (npm package)

### Future Enhancements
- Multi-brand configuration system
- Visual selector picker tool
- Machine learning content classification
- Plugin architecture for different CMS platforms
- Real-time content preview

## Notes

⚠️ **Important Notice**: This system was initially developed for limited dealership websites and may require customization for different dealer groups, OEMs, and competitor website structures.

The system uses hardcoded patterns optimized for automotive dealership sites and will need customization for other industries or website structures.

See the [README.md](../README.md) "Expansion & Customization" section for details on required customizations.

