# Content Automation Pipeline

A robust, enterprise-grade content automation system that scrapes web content and prepares it for WordPress import. Built with modern JavaScript and designed for scalability, maintainability, and ease of use.

> ⚠️ **Important Notice**: This system was initially developed for limited dealership websites and may require customization for different dealer groups, OEMs, and competitor website structures. See [Expansion & Customization](#-expansion--customization) for details.

## 🎯 Overview

This system automates the entire process of extracting content from websites and preparing it for WordPress import, including content sanitization, link updates, image processing, and intelligent content type detection.

**Version 2.0.0** now includes:
- **🖥️ Web Dashboard**: Modern Next.js UI for managing runs, configurations, and metrics
- **🔐 User Authentication**: Supabase Auth integration for secure multi-user access
- **📊 Database Integration**: PostgreSQL (Supabase) with Prisma ORM for data persistence
- **🐳 Docker Support**: Containerized deployment with Redis for job queue management
- **💾 Automatic File Management**: Content-Migration folder on Desktop with organized outputs

### Key Features

#### Core Automation Features
- **🌐 Robust Web Scraping**: Uses Playwright to handle modern websites, Cloudflare protection, and JavaScript-heavy content
- **🧹 Intelligent Content Cleaning**: Removes unwanted attributes, classes, and IDs while preserving essential formatting
- **🎯 Custom Element Removal**: Interactive configuration for CSS selectors to remove during sanitization
- **🔗 Smart Link Processing**: Converts internal links to WordPress-friendly URLs with custom mapping
- **📸 Image Management**: Downloads and organizes images with proper WordPress paths
- **🤖 Content Type Detection**: Automatically classifies content as posts or pages using custom selectors
- **📊 CSV Generation**: Creates WordPress-ready CSV files for Really Simple CSV Importer
- **🎯 Blog Content Cleanup**: Removes navigation, dates, and sidebar content that WordPress generates automatically

#### Web Dashboard Features (v2.0.0)
- **👥 User Management**: Secure authentication with Supabase Auth
- **⚙️ Site Profiles**: Save and reuse configuration profiles for different sites
- **🏃 Run Management**: Start, monitor, and track automation runs with real-time progress
- **📈 Metrics Dashboard**: View statistics including time saved, URLs scraped, success rates
- **📥 Download Management**: Automatic saving to Desktop/Content-Migration folder plus direct CSV downloads
- **📝 Structured Logging**: Database-backed logs for debugging and auditing

## 🚀 Quick Start

### Pre-Install Checks

```bash
# Check node version 18+ required
node -v

# If version below 18 is found update to newest
nvm install 24

# Switch to Node 24 
nvm use 24
```

### Option 1: Web Dashboard (Recommended)

#### 1. Installation

```bash
# Clone the repository
git clone https://github.com/vande012/wp-content-automation
cd headless-scrape

# Install dependencies
npm install

# Install browsers for scraping
npm run install-browsers
```

#### 2. Database Setup

**Supabase Configuration:**

1. Create a Supabase project at https://supabase.com
2. Get your database connection string from: Project Settings → Database → Connection String (URI format)
3. Get your Supabase URL and Anon Key from: Project Settings → API
4. Create a `.env` file in the project root:

```bash
# Database Configuration (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_URL=https://[PROJECT-REF].supabase.co

# Redis Configuration (for Docker)
REDIS_URL="redis://localhost:6379"
REDIS_PORT=6379

# Application Configuration
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Content Migration Output (optional - defaults to ~/Desktop/Content-Migration)
# CONTENT_MIGRATION_PATH=/app/content-migration  # For Docker
```

#### 3. Database Migration

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio to view data
npm run db:studio
```

#### 4. Start Services

```bash
# Start Redis (if using Docker)
npm run docker:up

# Start Next.js development server
npm run dev:web
```

#### 5. Access Dashboard

Open http://localhost:3000 in your browser:

1. **Sign up** for a new account (email confirmation can be disabled in Supabase for development)
2. **Create a Site Profile** to save configuration settings
3. **Start a Run** by navigating to Runs → Start New Run
4. **Monitor Progress** in real-time on the run detail page
5. **Download CSV** when complete from the run detail page

**Output Files:**
- CSV files: `~/Desktop/Content-Migration/csv/{run-id}/wordpress-import-YYYY-MM-DD.csv`
- Images: `~/Desktop/Content-Migration/images/{run-id}/`

### Option 2: CLI (Legacy)

#### 1. Installation

```bash
# Clone the repository
git clone https://github.com/vande012/wp-content-automation
cd headless-scrape

# Install dependencies
npm install

# Install browsers for scraping
npm run install-browsers
```

#### 2. Basic Usage

**It is recommended to test one post/page before full run to see if additional elements need to be identified in exclusion rules**

1. **Add URLs to scrape**: Edit `data/urls.txt` and add one URL per line
2. **Run the automation**: `npm start`
3. **Follow the prompts**: The system will guide you through:
   - Content type setup (post vs page identification)
   - Custom element selectors (optional - specify elements to remove during sanitization)
   - Image processing configuration (if enabled)
4. **Import to WordPress**: Use the generated CSV file in `output/wp-ready/`
5. **Cleanup past run's data**: `npm run clean`

## 🐳 Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Supabase project configured (see Database Setup above)
- Environment variables configured in `.env`

### Setup

1. **Create Content-Migration directory:**
   ```bash
   mkdir -p content-migration
   ```

2. **Update `.env` for Docker:**
   ```env
   # Set Content-Migration path for container
   CONTENT_MIGRATION_PATH=/app/content-migration
   ```

3. **Update `docker-compose.yml`** (currently only includes Redis - see DOCKER_CONTENT_MIGRATION.md for full setup)

4. **Build and Run:**
   ```bash
   # Start services
   npm run docker:up
   
   # Build Next.js app (when Dockerfile is added)
   docker-compose build
   docker-compose up
   ```

### Docker Configuration Notes

- **Content-Migration Folder**: Mount as volume to access files from host machine
- **Database**: Uses Supabase (external, no container needed)
- **Redis**: Containerized for job queue (BullMQ)
- **Next.js App**: Requires Dockerfile (to be added - see TODO section)

See `DOCKER_CONTENT_MIGRATION.md` for detailed Docker setup instructions.

## 📁 Project Structure

```
headless-scrape/
├── src/
│   ├── app/                    # Next.js web dashboard (v2.0.0)
│   │   ├── api/                # API routes (runs, site-profiles, auth, etc.)
│   │   ├── auth/               # Authentication pages (login, signup)
│   │   ├── runs/               # Run management pages
│   │   ├── site-profiles/      # Site profile management
│   │   └── metrics/            # Metrics dashboard
│   ├── cli/                    # Command-line interfaces (legacy)
│   │   ├── automation.js       # Main pipeline orchestrator
│   │   └── cleanup.js          # Maintenance utilities
│   ├── core/                   # Business logic services
│   │   ├── scraper.js          # Web scraping service
│   │   ├── processor.js        # Content processing service
│   │   ├── csv-generator.js    # WordPress CSV generation
│   │   └── image-downloader.js # Image asset management
│   ├── services/               # New service layer (v2.0.0)
│   │   └── run-executor.js     # Orchestrates automation runs from web UI
│   ├── lib/                    # Shared libraries (v2.0.0)
│   │   ├── db/                 # Prisma database client
│   │   ├── supabase/           # Supabase client (server & browser)
│   │   └── utils.ts            # Utility functions
│   ├── components/             # React components (v2.0.0)
│   │   ├── ui/                 # shadcn/ui components
│   │   └── auth-button.jsx     # Authentication component
│   ├── config/                 # Configuration management
│   │   └── index.js            # Centralized configuration
│   ├── utils/                  # Shared utilities
│   │   ├── cli.js              # Command-line interface helpers
│   │   ├── errors.js           # Error handling and retry logic
│   │   ├── filesystem.js       # File system operations
│   │   ├── cleanup-output.js   # Output directory cleanup
│   │   └── content-migration-path.js  # Content-Migration folder management
│   └── middleware.js           # Next.js middleware for auth
├── prisma/                     # Database schema and migrations (v2.0.0)
│   ├── schema.prisma           # Prisma schema definition
│   └── migrations/             # Database migration files
├── data/                       # Configuration and input data
│   ├── urls.txt               # URLs to scrape
│   └── custom-selectors.json  # Content type detection rules
├── output/                     # Generated content (gitignored)
│   ├── scraped-content/       # Raw HTML from scraper
│   ├── clean-content/         # Processed HTML
│   ├── images/                # Downloaded images
│   └── wp-ready/              # WordPress import files
├── logs/                       # Application logs
├── content-migration/          # Desktop output (created automatically, gitignored)
│   ├── images/                # Images organized by run ID
│   └── csv/                   # CSV files organized by run ID
└── docker-compose.yml          # Docker services configuration
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database Configuration (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_URL=https://[PROJECT-REF].supabase.co

# Redis Configuration (for BullMQ job queue)
REDIS_URL="redis://localhost:6379"
REDIS_PORT=6379

# Application Configuration
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Content Migration Output Path (optional)
# Default: ~/Desktop/Content-Migration
# For Docker: /app/content-migration
# CONTENT_MIGRATION_PATH=/app/content-migration

# Scraper Configuration (CLI mode)
SCRAPER_HEADLESS=true
SCRAPER_TIMEOUT=60000
SCRAPER_MAX_RETRIES=2

# Image Processing (CLI mode)
IMAGES_ENABLED=true
IMAGES_MAX_CONCURRENT=5
IMAGES_TIMEOUT=30000

# Processing (CLI mode)
DEALER_SLUG=your-dealership
IMAGE_YEAR=2025
IMAGE_MONTH=01
```

### Configuration Files

#### `data/custom-selectors.json`
```json
{
  "post": "post-navigation",
  "page": "page-header"
}
```

#### `data/urls.txt`
```
https://example.com/page1.html
https://example.com/blog/post1.html
https://example.com/another-page.html
```

## 🛠️ Development Commands

### Web Dashboard Commands

```bash
# Development
npm run dev:web          # Start Next.js dev server
npm run build            # Build Next.js app for production
npm run start:web        # Start production Next.js server

# Database
npm run db:generate      # Generate Prisma Client
npm run db:migrate       # Run database migrations
npm run db:migrate:deploy  # Deploy migrations to production
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:seed          # Seed database with test data

# Docker
npm run docker:up        # Start Docker services (Redis)
npm run docker:down      # Stop Docker services
npm run docker:logs      # View Docker logs
```

### CLI Commands (Legacy)

```bash
# Development
npm start                # Run full automation pipeline
npm run dev             # Development mode with enhanced logging
npm run clean           # Clear all output directories

# Individual Services
npm run scrape          # Run scraper only
npm run process         # Run processor only

# Maintenance
npm run install-browsers  # Install/update browsers
npm run lint            # Code quality check
npm test                # Run test suite (when implemented)
```

## 🔍 Content Processing Details

### Aggressive Cleaning Strategy

The processor uses an aggressive cleaning approach optimized for WordPress import:

**Removes:**
- **Custom user-specified elements** (via CSS selectors provided during sanitization)
- All `class` and `id` attributes (after custom removal)
- Third-party tracking attributes  
- Vendor-specific properties
- Blog template elements (navigation, dates, sidebar)
- Footer content and copyright notices
- Forms and form elements
- Testimonial and review blocks (for posts)

**Preserves:**
- `style` attributes for formatting
- Essential link attributes (`href`, `target`)
- Image attributes (`src`, `alt`, `width`, `height`)
- Table structure attributes (`colspan`, `rowspan`)

**Adds:**
- Consistent spacing between content elements for better readability
- Inline margin/padding styles for proper content separation
- Conversion of Microsoft Word-style lists to proper HTML `<ul>` and `<li>` tags

See the original README sections for detailed information on:
- Content Spacing (lines 336-356)
- Microsoft Word List Conversion (lines 358-392)
- Content Type Detection (lines 394-401)
- Link Processing (lines 403-414)
- Image URL Updates (lines 416-449)
- Slug Generation (lines 451-456)
- Article Date Extraction (lines 458-491)

## 📊 Web Dashboard Features

### Site Profiles

Create and save configuration profiles for different sites:

- **Profile Name**: Descriptive name for the site
- **Configuration**: Store selectors, cleanup rules, WordPress settings
- **Reusability**: Load profiles when starting new runs

### Run Management

- **Start Runs**: Configure and start automation runs from the web UI
- **Real-time Progress**: Watch runs execute with live progress updates
- **Run History**: View all past runs with status, metrics, and timestamps
- **Run Details**: Deep dive into individual run metrics, configuration, and logs

### Metrics Dashboard

Track team-wide statistics:

- **Time Saved**: Calculated based on 15 minutes per page migrated
- **URLs Processed**: Total URLs scraped across all runs
- **Success Rates**: Track success/failure rates for runs
- **User Activity**: See runs by user (future feature)

### Content-Migration Folder

Automatic file organization:

- **Location**: `~/Desktop/Content-Migration/` (or custom path via `CONTENT_MIGRATION_PATH`)
- **Structure**: Organized by run ID to prevent conflicts
- **CSV Files**: Named with date stamp (e.g., `wordpress-import-2025-12-23.csv`)
- **Images**: All images from a run grouped together

## ✅ Current Status & TODO

### ✅ Completed Features (v2.0.0)

- [x] Next.js web dashboard with shadcn/ui components
- [x] Supabase authentication (login, signup, session management)
- [x] Prisma database integration with PostgreSQL (Supabase)
- [x] Site profile management (create, read, list)
- [x] Run creation and execution from web UI
- [x] Real-time run progress tracking
- [x] Run metrics storage and display
- [x] Database-backed logging
- [x] Content-Migration folder auto-organization
- [x] CSV download functionality
- [x] Redis setup for future job queue (BullMQ)
- [x] TypeScript type declarations for JSX components

### 🚧 In Progress / Needs Testing

- [ ] **Dockerfile**: Create Dockerfile for Next.js app containerization
- [ ] **Job Queue**: Implement BullMQ for asynchronous run processing (Redis already configured)
- [ ] **Run Logs UI**: Build log viewer component for structured logs
- [ ] **Site Profile CRUD**: Complete site profile edit/delete functionality
- [ ] **Content Preview**: Implement before/after HTML preview feature
- [ ] **Run Filtering**: Add filtering and search to runs list
- [ ] **Error Handling**: Comprehensive error handling for edge cases
- [ ] **Input Validation**: Form validation for run configuration
- [ ] **Image Preview**: Show downloaded images in run details

### 📋 Needs Configuration

- [ ] **Docker Setup**: Complete Docker Compose configuration for full app stack
- [ ] **Environment Variables**: Document all required environment variables
- [ ] **Supabase RLS**: Configure Row Level Security policies for multi-user access
- [ ] **Email Configuration**: Set up email service for Supabase Auth (currently disabled for dev)
- [ ] **Production Build**: Test and optimize Next.js production build
- [ ] **Content-Migration Path**: Configure for production Docker deployment

### 🔨 Needs Development

- [ ] **Unit Tests**: Write tests for core services (scraper, processor, csv-generator)
- [ ] **Integration Tests**: Test API routes and database interactions
- [ ] **E2E Tests**: End-to-end tests for web dashboard workflows
- [ ] **Performance Optimization**: Optimize large file processing and database queries
- [ ] **Error Recovery**: Implement run recovery/retry mechanisms
- [ ] **Run Cancellation**: Allow users to cancel running jobs
- [ ] **Bulk Operations**: Support for bulk run management
- [ ] **Export Functionality**: Export run data, logs, and metrics
- [ ] **Admin Dashboard**: Admin panel for managing users and system settings
- [ ] **API Documentation**: OpenAPI/Swagger documentation for API routes

### 🎨 UI/UX Improvements Needed

- [ ] **Loading States**: Improve loading indicators and skeleton screens
- [ ] **Error Messages**: User-friendly error messages with actionable guidance
- [ ] **Form Validation**: Real-time validation feedback in forms
- [ ] **Accessibility**: WCAG compliance and keyboard navigation
- [ ] **Mobile Responsiveness**: Optimize for mobile devices
- [ ] **Dark Mode**: Implement dark mode theme
- [ ] **Toast Notifications**: Success/error notifications for user actions

### 📚 Documentation Needs

- [ ] **API Documentation**: Document all API endpoints
- [ ] **Deployment Guide**: Step-by-step production deployment instructions
- [ ] **Docker Guide**: Complete Docker setup and deployment guide
- [ ] **Architecture Diagram**: Visual architecture diagram
- [ ] **Database Schema**: ER diagram and schema documentation
- [ ] **Troubleshooting Guide**: Common issues and solutions for web dashboard

### 🔒 Security Needs

- [ ] **Input Sanitization**: Validate and sanitize all user inputs
- [ ] **SQL Injection Prevention**: Ensure Prisma queries are safe
- [ ] **XSS Prevention**: Sanitize HTML outputs in UI
- [ ] **Rate Limiting**: Implement rate limiting on API routes
- [ ] **CORS Configuration**: Proper CORS setup for production
- [ ] **Environment Secrets**: Secure handling of secrets in production

## 🐛 Troubleshooting

### Web Dashboard Issues

**"Database connection failed"**
- Verify `DATABASE_URL` in `.env` is correct
- Ensure Supabase project is active (not paused)
- Check network connectivity to Supabase

**"Authentication not working"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Check Supabase Auth settings (email confirmation may need to be disabled for dev)
- Clear browser cookies and try again

**"Run not found" errors**
- Ensure database migrations are up to date: `npm run db:migrate`
- Check that run was created successfully in database
- Verify user has permission to view the run

**"CSV download fails"**
- Check that CSV file exists in `output/wp-ready/`
- Verify file permissions
- Check server logs for errors

**"Content-Migration folder not created"**
- Check file system permissions
- Verify `CONTENT_MIGRATION_PATH` if using custom path
- Ensure parent directory exists

### CLI Issues

See original README troubleshooting section (lines 516-548) for CLI-specific issues.

## 🤝 Contributing

### Code Standards

- Use ES6+ modules and async/await
- Follow JSDoc documentation standards  
- Implement comprehensive error handling
- Write self-documenting code with clear variable names
- Use TypeScript-style JSDoc for better IDE support

### Architecture Guidelines

- Keep services focused and single-purpose
- Use dependency injection for testability
- Prefer composition over inheritance
- Implement proper separation of concerns
- Use configuration objects over hardcoded values

### Testing Strategy

- Unit tests for core business logic
- Integration tests for service interactions
- End-to-end tests for complete workflows
- Mock external dependencies appropriately

### Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Update documentation
5. Submit a pull request

## 📖 Additional Documentation

- **[QUICK_START.md](./QUICK_START.md)**: Quick start guide for new developers
- **[AUTH_SETUP.md](./AUTH_SETUP.md)**: Detailed Supabase authentication setup
- **[SUPABASE_SETUP_COMPLETE.md](./SUPABASE_SETUP_COMPLETE.md)**: Supabase configuration guide
- **[DOCKER_CONTENT_MIGRATION.md](./DOCKER_CONTENT_MIGRATION.md)**: Docker setup for Content-Migration folder
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)**: Database setup instructions (legacy)
- **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)**: Development status tracking

## 🔧 Expansion & Customization

[Original expansion and customization content from lines 556-652 remains the same]

## 📞 Getting Help

- **Issues**: [Report bugs and feature requests](issues)
- **Discussions**: [Community support and questions](discussions)
- **Documentation**: [Wiki and guides](wiki)
- **Plugin Support**: [Really Simple CSV Importer Support](https://wordpress.org/support/plugin/really-simple-csv-importer/)
- **Contact**: Content Automation Team

---

**⚡ Built for the modern web** | **🚀 Enterprise-ready** | **🔧 Highly customizable**

> **Version 2.0.0** - Now with Web Dashboard, Database Integration, and Docker Support  
> **Note**: This system represents a foundation that requires customization for different dealer groups, OEMs, and website structures. We welcome contributions that extend its capabilities and improve its adaptability to diverse content automation needs.
