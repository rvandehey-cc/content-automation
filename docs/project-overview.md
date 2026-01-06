# Project Overview: wp-content-automation

## Executive Summary
`wp-content-automation` (internally `headless-scraper`) is a robust, modular automation pipeline designed to scrape content from websites (specifically targeting automotive dealership sites) and process it for import into WordPress. It handles complex challenges like Cloudflare protection, image downloading, HTML sanitization, and link normalization.

## Core Objectives
- **Robust Scraping**: Reliable content extraction from JS-heavy sites using Playwright.
- **Content Sanitization**: Aggressive cleaning of HTML while preserving Bootstrap layout classes for consistent styling in WordPress.
- **Asset Management**: Automatic downloading and mapping of images to the WordPress upload directory structure.
- **Seamless Integration**: Generation of WordPress-ready CSV files for bulk content migration.

## Technology Stack
- **Runtime**: Node.js >= 18.0.0
- **Browser Automation**: Playwright (for scraping and bypassing protections)
- **HTML/DOM**: JSDOM and Cheerio (for content manipulation and cleaning)
- **Filesystem**: fs-extra (for robust file operations)
- **Process Management**: p-queue (for concurrency management)
- **Logging**: Winston

## Key Features
- **Cloudflare Bypass**: Leverages Playwright's headless browser to handle dynamic site protections.
- **Bootstrap Preservation**: Specifically keeps layout classes (grids, spacing) to ensure migrated content maintains its structure.
- **Image Mapping**: Converts original site images to correctly pathed WordPress upload URLs based on dealer slug and date.
- **Client-Side Helpers**: Includes a "Fixer" bookmarklet for managing metadata within the WordPress interface.
