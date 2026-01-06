---
project_name: 'wp-content-automation'
user_name: 'Ryanvandehey'
date: '2026-01-06T14:24:00Z'
sections_completed: ['technology_stack', 'architectural_patterns', 'implementation_rules']
existing_patterns_found: 12
---

# Project Context: wp-content-automation

This document provides critical implementation rules and architectural context optimized for AI coding assistants. Focus on these rules to maintain consistency and prevent common implementation mistakes.

## 🛠 Technology Stack (Verified)

- **Runtime**: Node.js >= 18.0.0 (ECMAScript Modules)
- **Scraping**: Playwright ^1.40.0 (Chromium)
- **DOM Engine**: JSDOM ^23.2.0 (for complex cleaning), Cheerio ^1.0.0-rc.12 (for lightweight extraction)
- **Utilities**: fs-extra ^11.1.1, p-queue ^7.4.1, winston ^3.11.0
- **UI/CLI**: blessed-contrib, reblessed (Dashboard-style CLI)

## 🏗 Architectural Patterns

- **Layered Service Architecture**: 
  - `src/core/`: Heavy lifting (Scraper, Processor, etc.)
  - `src/cli/`: Minimal wrappers/orchestrators
  - `src/config/`: Single source of truth for all paths and settings
- **Pipeline Flow**: Input (URLs) → Scraping (HTML) → Image Sync → Content Processing → CSV Export
- **Resiliency Wrapper**: Centralized `retry` logic in `src/utils/errors.js` for all volatile operations.

## 🚨 Critical Implementation Rules

### 1. HTML Sanitization (Strict Enforcement)
When modifying the `ContentProcessorService`, follow the aggressive cleaning rule:
- **Remove ALL** `id` and `class` attributes.
- **WHITELIST EXCEPTIONS**: Preserve Bootstrap layout classes:
  - `row`, `container`, `container-fluid`, `col-*`
  - `text-left`, `text-center`, `text-right`
  - `mt-*`, `mb-*`, `pt-*`, `pb-*` (spacing utilities)
  - `d-none`, `d-block`, `align-*`, `justify-*`

### 2. Image Path Mapping
Image URLs must be normalized to the Dealer Inspire development environment structure:
- **Format**: `https://di-uploads-development.dealerinspire.com/${dealerSlug}/uploads/${year}/${month}/${filename}`
- **Context**: Never leave raw source URLs in processed output.

### 3. Selector Strategy
Always use the prioritized selector list in `scraper.js`. Do not hardcode specific site IDs unless absolutely necessary as a final fallback.
- **Priority**: `article` > `.post-content` > `.entry-content` > `main` > `body`

### 4. File I/O
- Always use `fs-extra` for promise-based operations.
- Use `config.resolvePath()` for all file/directory references to ensure cross-OS compatibility.

## 📂 Knowledge Mapping
- **Overview**: `_bmad-output/project-overview.md`
- **Architecture**: `_bmad-output/architecture.md`
- **Dev Guide**: `_bmad-output/development-guide.md`
