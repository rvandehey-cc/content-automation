# Project Overview: wp-content-automation

## Executive Summary
`wp-content-automation` (internally `headless-scraper`) is a sophisticated hybrid automation ecosystem. Originally a Node.js CLI tool, it has evolved into a comprehensive platform featuring a **Next.js Web Dashboard** for management and observability, and a **PostgreSQL (Supabase)** persistence layer for tracking site profiles and scraping runs.

## Core Objectives
- **Robust Scraping**: Reliable content extraction from JS-heavy sites using Playwright.
- **Enterprise Management**: A centralized web interface to manage dealer site profiles, configurations, and job monitoring.
- **Data Persistence**: Centralized storage of scraping results, logs, and site metadata using Prisma and Supabase.
- **Content Sanitization**: Aggressive cleaning of HTML while preserving Bootstrap structure for WordPress portability.
- **Asset Management**: Automatic downloading and mapping of images to the WordPress upload directory structure.

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
