# Project Documentation Index

## Project Overview

- **Type**: Monolith CLI Tool
- **Primary Language**: JavaScript (Node.js >=18.0.0)
- **Architecture**: Service-Oriented Layered Architecture
- **Project Name**: wp-content-automation (headless-scraper)

## Quick Reference

### Tech Stack Summary
- **Runtime**: Node.js >=18.0.0
- **Browser Automation**: Playwright ^1.40.0
- **DOM Manipulation**: JSDOM ^23.2.0, Cheerio ^1.0.0-rc.12
- **Logging**: Winston ^3.11.0
- **Environment**: dotenv ^16.6.1

### Entry Points
- **Main CLI**: `src/cli/automation.js` (Run with `npm start`)
- **Helper Tool**: `wp-metadata-helper.js` (Bookmarklet for WP Alt Text)
- **Helper Tool**: `wp-bulk-alt-fixer.js` (Bulk Alt Text utility)

## Generated Documentation

### Core Documentation Files

1. **[Project Overview](./project-overview.md)**
   - Executive summary and project purpose
   - Core technology stack
   - Quick reference and entry points

2. **[Architecture Documentation](./architecture.md)**
   - Detailed service-oriented architecture
   - Data flow and pipeline logic
   - Error handling and configuration strategy

3. **[Source Tree Analysis](./source-tree-analysis.md)**
   - Annotated directory structure
   - Component responsibilities
   - Critical folders and entry points

4. **[Development Guide](./development-guide.md)**
   - Prerequisites and installation
   - Local development and execution
   - Environment configuration

5. **[Technology Stack](./technology-stack.md)**
   - Detailed dependency analysis
   - Framework and library justification

## Existing Documentation

- **[README.md](../README.md)**: Original project README with usage instructions.

## Getting Started

1. **Install dependencies**: `npm install && npm run install-browsers`
2. **Setup environment**: Create a `.env` file based on `src/config/index.js` defaults.
3. **Add target URLs**: Populate `data/urls.txt`.
4. **Run automation**: `npm start`.
