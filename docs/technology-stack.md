# Technology Stack

## Core Technologies

| Technology | Purpose | Key Dependency |
|------------|---------|----------------|
| **Runtime** | Execution Environment | Node.js >= 18.0.0 |
| **Automation** | Headless Browser Control | `playwright` |
| **DOM Engine** | HTML Parsing and Rendering | `jsdom` |
| **Fast Parsing** | Lightweight Content Extraction | `cheerio` |
| **Storage** | Enhanced Filesystem API | `fs-extra` |
| **Concurrency** | Managing Parallel Operations | `p-queue` |
| **Environment** | Configuration Management | `dotenv` |
| **Logging** | Structured Application Logs | `winston` |

## Dependency Analysis

### Production Dependencies
- **playwright**: Used for headless browser automation. Chosen for its superior handling of SPAs and modern site protections like Cloudflare.
- **jsdom**: Provides a full DOM implementation in Node.js. Used in the `ContentProcessorService` for complex HTML manipulations that require a standard DOM API.
- **cheerio**: Used for faster, lighter-weight HTML parsing and selection where a full DOM isn't necessary.
- **fs-extra**: Adds promise support and convenience methods (like `ensureDir`) to the standard `fs` module.
- **winston**: Standardized logging for CLI execution debugging.

### Development Dependencies
- **@types/node**: Type definitions for better IDE support.
- **Playwright Browser Binaries**: Necessary for the automation service to function.

## Architectural Choices

- **Modular Services**: Decoupling scraping, processing, and exporting ensures that any single failure doesn't require a full restart of the entire pipeline.
- **Bootstrap-First Sanitization**: The decision to preserve Bootstrap classes while stripping others balances the need for clean, portable HTML with the need for visually consistent layout in WordPress.
- **JSON-Based State**: Using `json` files for image mapping and URL tracking ensures that the pipeline is easy to inspect and debug during development.
- **Singleton Config**: Centralizing configuration management prevents "config-drift" across different services and simplify environment-based deployments.
