# Technology Stack Analysis

## Technology Stack Table

| Category | Technology | Version | Justification |
|----------|-----------|---------|---------------|
| **Runtime** | Node.js | >=18.0.0 | Required runtime environment for JavaScript execution |
| **Module System** | ES6 Modules | - | Uses `"type": "module"` for modern import/export syntax |
| **Primary Language** | JavaScript | ES2020+ | Core implementation language |
| **Architecture Pattern** | Service-Oriented / Layered | - | Clean separation: CLI → Services → Utils → Config |

## Core Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| **playwright** | ^1.40.0 | Headless browser automation for web scraping, Cloudflare bypass |
| **jsdom** | ^23.2.0 | Server-side DOM manipulation and HTML parsing |
| **cheerio** | ^1.0.0-rc.12 | jQuery-like server-side HTML parsing (alternative DOM manipulation) |
| **winston** | ^3.11.0 | Structured logging framework |
| **fs-extra** | ^11.1.1 | Enhanced filesystem operations with promises |
| **node-fetch** | ^3.3.2 | HTTP client for image downloads |
| **p-queue** | ^7.4.1 | Concurrent task queue with rate limiting |
| **dotenv** | ^16.6.1 | Environment variable configuration |
| **blessed-contrib** | ^4.11.0 | Terminal UI components (progress bars, tables) |
| **reblessed** | ^0.2.1 | Blessed library fork for modern Node.js |
| **user-agents** | ^1.1.0 | User agent string generation for web scraping |

## Development Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| **eslint** | ^8.55.0 | Code linting and quality checks |

## Architecture Pattern

**Service-Oriented Layered Architecture**

The project follows a clean layered architecture with service-based organization:

```
┌─────────────────────────────────────────┐
│     CLI Layer (automation.js)           │  ← User Interface & Orchestration
├─────────────────────────────────────────┤
│  Core Services Layer                    │
│  ├── HTMLScraperService                 │  ← Web scraping
│  ├── ImageDownloaderService             │  ← Image management
│  ├── ContentProcessorService            │  ← HTML sanitization
│  └── CSVGeneratorService                │  ← WordPress CSV generation
├─────────────────────────────────────────┤
│  Utility Layer                          │
│  ├── cli.js                             │  ← CLI helpers
│  ├── errors.js                          │  ← Error handling & retry logic
│  └── filesystem.js                      │  ← File operations
├─────────────────────────────────────────┤
│  Configuration Layer                    │
│  └── config/index.js                    │  ← Centralized configuration
└─────────────────────────────────────────┘
```

### Key Architectural Principles

1. **Separation of Concerns**: Each service handles one specific responsibility
2. **Dependency Injection**: Services accept configuration via constructor options
3. **Configuration-Driven**: Externalized configuration via environment variables and config files
4. **Error Resilience**: Comprehensive error handling with retry mechanisms
5. **Progress Tracking**: Real-time feedback for long-running operations

## Framework & Library Choices

- **Playwright over Puppeteer/Selenium**: Better Cloudflare bypass capabilities, modern API
- **JSDOM over Cheerio for complex operations**: More complete DOM implementation for complex HTML manipulation
- **Cheerio for simple parsing**: Lighter-weight for quick HTML queries
- **Winston for logging**: Structured logging with multiple transport options
- **p-queue for concurrency**: Controlled concurrent operations with rate limiting

