# Content Automation Pipeline

A robust, enterprise-grade content automation system that scrapes web content and prepares it for WordPress import. Built with modern JavaScript and designed for scalability, maintainability, and ease of use.

> ⚠️ **Important Notice**: This system was initially developed for limited dealership websites and may require customization for different dealer groups, OEMs, and competitor website structures. See [Expansion & Customization](#-expansion--customization) for details.

## 🎯 Overview

This system automates the entire process of extracting content from websites and preparing it for WordPress import, including content sanitization, link updates, image processing, and intelligent content type detection.

### Key Features

- **🌐 Robust Web Scraping**: Uses Playwright to handle modern websites, Cloudflare protection, and JavaScript-heavy content
- **🧹 Intelligent Content Cleaning**: Removes unwanted attributes, classes, and IDs while preserving essential formatting
- **🎯 Custom Element Removal**: Interactive prompt allows you to specify CSS selectors for elements to remove during sanitization
- **🔗 Smart Link Processing**: Converts internal links to WordPress-friendly URLs with custom mapping
- **📸 Image Management**: Downloads and organizes images with proper WordPress paths
- **🤖 Content Type Detection**: Automatically classifies content as posts or pages using custom selectors
- **📊 CSV Generation**: Creates WordPress-ready CSV files for Really Simple CSV Importer
- **🎯 Blog Content Cleanup**: Removes navigation, dates, and sidebar content that WordPress generates automatically
- **⚡ Modular Architecture**: Clean separation of concerns with service-based design

## 🚀 Quick Start (For Content Developers)

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd headless-scrape

# Install dependencies
npm install

# Install browsers for scraping
npm run install-browsers
```

### 2. Basic Usage

1. **Add URLs to scrape**: Edit `data/urls.txt` and add one URL per line
2. **Run the automation**: `npm start`
3. **Follow the prompts**: The system will guide you through:
   - Content type setup (post vs page identification)
   - Custom element selectors (optional - specify elements to remove during sanitization)
   - Image processing configuration (if enabled)
4. **Import to WordPress**: Use the generated CSV file in `output/wp-ready/`
5. **Cleanup past run's data**: `npm run clean`

### 3. Content Type Setup

When prompted, provide class names to help identify posts vs pages:

- **For Posts**: Enter a class name that appears only on blog posts (e.g., `post-navigation`)
- **For Pages**: Enter a class name that appears only on static pages (e.g., `page-header`)

**Example**: If you see `<div class="post-navigation">` on blog posts, just enter `post-navigation`
**Note**: This will only work for content within the body of the page, not the header or footer.

> 💡 **Tip**: Use browser developer tools (F12) to inspect HTML and find unique class names

### 4. Custom Element Removal

During the sanitization step, you'll be prompted to specify CSS selectors for elements you want to remove or ignore:

**When prompted**: After confirming HTML sanitization, you can enter custom CSS selectors
**Examples of selectors**:
- `.advertisement` - Remove all elements with the "advertisement" class
- `#social-share` - Remove element with ID "social-share"
- `[class*="popup"]` - Remove elements with "popup" anywhere in the class name
- `div.newsletter, section.promotional` - Multiple selectors separated by commas
- `footer .widget` - Nested selectors

**How it works**:
- Enter one selector at a time
- Press Enter with no input to finish adding selectors
- All matching elements will be removed before other sanitization steps
- Selectors are processed early, so you can target classes and IDs before they're removed

**Use cases**:
- Remove advertisement blocks
- Remove social sharing widgets
- Remove newsletter signup forms
- Remove promotional banners
- Remove any site-specific elements that shouldn't be imported

> 💡 **Tip**: Use browser developer tools to inspect elements and find the right selectors. The selectors work just like CSS, so you can use class names, IDs, attribute selectors, and more.

### 5. WordPress Import

#### Required Plugin
Activate the **Really Simple CSV Importer** plugin found in our environment:

- **Plugin Name**: Really Simple CSV Importer
- **Version**: 1.3 (or newer)
- **Author**: Takuro Hishikawa
- **Description**: Import posts, categories, tags, custom fields from simple CSV file
- **WordPress Plugin Directory**: [Really Simple CSV Importer](https://wordpress.org/plugins/really-simple-csv-importer/)

#### Import Process
1. **Install & Activate**: Install the Really Simple CSV Importer plugin and activate it
2. **Navigate to Importer**: Go to **Tools → Import → CSV Importer**
3. **Upload CSV**: Upload the generated `wordpress-import.csv` file from `output/wp-ready/`
4. **Map Fields**: Map CSV columns to WordPress fields (usually auto-detected)
5. **Run Import**: Execute the import and review the results

> 💡 **Important**: The plugin must be activated before you can access the CSV import functionality

## 🏗️ Technical Architecture (For Engineers)

### System Design Principles

- **Separation of Concerns**: Each service handles one specific responsibility
- **Error Resilience**: Comprehensive error handling with retry mechanisms
- **Configuration-Driven**: Externalized configuration for different environments
- **Progress Tracking**: Real-time feedback for long-running operations
- **Memory Efficient**: Streaming processing for large datasets

### Core Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI Layer (automation.js)                │
├─────────────────────────────────────────────────────────────┤
│  HTMLScraperService  │  ContentProcessorService  │  CSV...  │
├─────────────────────────────────────────────────────────────┤
│           Utility Layer (errors, filesystem, cli)           │
├─────────────────────────────────────────────────────────────┤
│              Configuration Layer (config/index.js)          │
└─────────────────────────────────────────────────────────────┘
```

### Service Details

#### HTMLScraperService (`src/core/scraper.js`)
- **Purpose**: Web scraping with Playwright
- **Features**: 
  - Cloudflare protection bypass
  - Retry mechanisms with exponential backoff  
  - Cookie and session management
  - Content extraction from dynamic pages
- **Input**: URLs from `data/urls.txt`
- **Output**: Raw HTML files in `output/scraped-content/`

#### ContentProcessorService (`src/core/processor.js`)
- **Purpose**: HTML sanitization and WordPress preparation
- **Features**:
  - Aggressive attribute cleaning (removes all classes/IDs)
  - **Custom element removal** - User-specified CSS selectors for targeted element removal
  - Style preservation for formatting
  - Link canonicalization and internal link conversion
  - Content type detection (post vs page)
  - Blog element removal (navigation, dates, sidebar)
  - Footer and copyright cleanup
- **Input**: Raw HTML from scraper
- **Output**: Clean HTML in `output/clean-content/`

#### CSVGeneratorService (`src/core/csv-generator.js`)
- **Purpose**: WordPress CSV generation
- **Features**:
  - Really Simple CSV Importer v1.3+ compatibility
  - Slug generation from URLs
  - Title extraction and cleaning
  - Post metadata generation
  - Automatic post type detection (post vs page)
  - **Article date extraction** - Intelligently finds and parses publish dates from content
- **Input**: Processed HTML files
- **Output**: WordPress CSV in `output/wp-ready/`

#### ImageDownloaderService (`src/core/image-downloader.js`)
- **Purpose**: Image asset management
- **Features**:
  - Concurrent download with rate limiting
  - Format validation and conversion
  - WordPress-friendly naming and organization
  - Image mapping for link updates

### Data Flow

```
URLs (data/urls.txt) 
  → HTMLScraperService 
  → Raw HTML (output/scraped-content/)
  → ContentProcessorService 
  → Clean HTML (output/clean-content/)
  → CSVGeneratorService 
  → WordPress CSV (output/wp-ready/)
```

## 📁 Project Structure

```
headless-scrape/
├── src/
│   ├── cli/                    # Command-line interfaces
│   │   ├── automation.js       # Main pipeline orchestrator
│   │   └── cleanup.js          # Maintenance utilities
│   ├── core/                   # Business logic services
│   │   ├── scraper.js          # Web scraping service
│   │   ├── processor.js        # Content processing service
│   │   ├── csv-generator.js    # WordPress CSV generation
│   │   └── image-downloader.js # Image asset management
│   ├── config/                 # Configuration management
│   │   └── index.js            # Centralized configuration
│   └── utils/                  # Shared utilities
│       ├── cli.js              # Command-line interface helpers
│       ├── errors.js           # Error handling and retry logic
│       └── filesystem.js       # File system operations
├── data/                       # Configuration and input data
│   ├── urls.txt               # URLs to scrape
│   └── custom-selectors.json  # Content type detection rules
├── output/                     # Generated content
│   ├── scraped-content/       # Raw HTML from scraper
│   ├── clean-content/         # Processed HTML
│   ├── images/                # Downloaded images
│   └── wp-ready/              # WordPress import files
└── logs/                       # Application logs
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Scraper Configuration
SCRAPER_HEADLESS=true          # Run browser in headless mode
SCRAPER_TIMEOUT=60000          # Page load timeout (ms)
SCRAPER_MAX_RETRIES=2          # Retry attempts for failed scrapes

# Image Processing
IMAGES_ENABLED=true            # Enable image downloading
IMAGES_MAX_CONCURRENT=5        # Concurrent download limit
IMAGES_TIMEOUT=30000           # Image download timeout

# Processing
DEALER_SLUG=your-dealership    # For image path generation
IMAGE_YEAR=2025               # For image organization
IMAGE_MONTH=01                # For image organization
```

### Configuration Files

#### `data/custom-selectors.json`
```json
{
  "post": "post-navigation",   // Class name for blog posts
  "page": "page-header"        // Class name for static pages (optional)
}
```

#### `data/urls.txt`
```
https://example.com/page1.html
https://example.com/blog/post1.html
https://example.com/another-page.html
```

## 🛠️ Tools and Dependencies

### Core Dependencies
- **Playwright** (^1.40.0): Headless browser automation
- **JSDOM** (^23.2.0): Server-side DOM manipulation
- **Cheerio** (^1.0.0): jQuery-like server-side HTML parsing
- **Winston** (^3.11.0): Structured logging
- **fs-extra** (^11.1.1): Enhanced filesystem operations

### System Requirements
- **Node.js 18+**: Runtime environment
- **Chrome/Chromium**: Installed by Playwright
- **4GB+ RAM**: For processing large content sets
- **Modern OS**: Windows 10+, macOS 10.14+, Ubuntu 18.04+

## 🔧 Development Commands

```bash
# Development
npm start                  # Run full automation pipeline
npm run dev               # Development mode with enhanced logging
npm run clean             # Clear all output directories

# Individual Services (if implemented)
npm run scrape            # Run scraper only
npm run process           # Run processor only

# Maintenance
npm run install-browsers  # Install/update browsers
npm run lint             # Code quality check
npm test                 # Run test suite (when implemented)
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

### Content Spacing

The processor automatically adds consistent spacing to ensure proper formatting when imported into WordPress:

**Uniform Spacing:** All content elements receive **20pt margin top and bottom** for optimal readability

Elements that receive spacing:
- **Paragraphs** (`<p>`) - *except those inside list items*
- **Headings** (`<h2>` through `<h6>`)
- **Tables** (`<table>`)
- **Images** (`<img>`)
- **Lists** (`<ul>`, `<ol>`) - spacing applied to container only
- **Blockquotes** (`<blockquote>`)
- **Content divs** (divs with text content, boxes, containers)

**Excluded from spacing:**
- Paragraphs inside `<li>` elements (prevents double spacing)
- Table-responsive wrapper divs
- Large container divs with nested block elements

**Note:** The processor removes any existing margin-top and margin-bottom styles and replaces them with the uniform 20pt spacing. Other style properties (colors, fonts, line-height, etc.) are preserved.

### Microsoft Word List Conversion

Many CMS platforms export lists using Microsoft Word formatting instead of proper HTML list tags. The processor automatically detects and converts these to proper HTML:

**Detects:**
- Paragraphs with bullet characters (●, •, ◦, ▪, etc.)
- Paragraphs with `mso-list` styles (Microsoft Office formatting)
- Paragraphs with hanging indents (list-style formatting)

**Converts to:**
- Proper `<ul>` (unordered list) tags
- Individual `<li>` (list item) tags
- Removes bullet characters from text content
- **Strips all `mso-` styles** (Microsoft Office formatting)
- **Removes `white-space: pre`** from all list elements (prevents formatting issues)
- **Unwraps `<p>` tags inside list items** (prevents double spacing)
- Groups consecutive list items together
- Relies on default HTML list styling

**Result:** Clean, vertical bulleted lists with proper spacing and no Word artifacts

**Example:**
```html
<!-- Before -->
<ul style="white-space: pre">
  <li style="white-space: pre">
    <p style="margin: 20pt; white-space: pre">Forward Collision-Avoidance Assist</p>
  </li>
</ul>

<!-- After -->
<ul>
  <li>Forward Collision-Avoidance Assist</li>
</ul>
```

### Content Type Detection

The system intelligently classifies content using:

1. **Custom Selectors**: User-defined class names for posts vs pages
2. **URL Patterns**: `/blog/`, `/news/`, etc. indicate posts
3. **Content Analysis**: Testimonials, reviews, and comparisons suggest posts
4. **Fallback Rules**: When uncertain, defaults to pages

### Link Processing

Internal links are automatically converted to WordPress-friendly URLs:

| Original Pattern | WordPress URL |
|-----------------|---------------|
| `new` | `/new-vehicles/` |
| `used` | `/used-vehicles/` |
| `contact` | `/contact-us/` |
| `service` | `/service/` |
| `parts` | `/parts/` |
| `sitemap` | `/sitemap/` |

### Image URL Updates

After downloading images, the system prompts you for WordPress upload settings and updates all image URLs to match the expected WordPress structure.

**WordPress Image URL Format:**
```
https://di-uploads-development.dealerinspire.com/{dealer-slug}/uploads/{year}/{month}/{filename}
```

**Example:**
```
Original: https://example.com/images/car-photo.jpg
Updated:  https://di-uploads-development.dealerinspire.com/albanytoyota/uploads/2025/01/car-photo.jpg
```

**Configuration Prompts:**
- **Dealer Slug**: The dealership identifier (e.g., `albanytoyota`, `delrayhyundai`)
- **Upload Year**: Year for the upload path (defaults to current year)
- **Upload Month**: Month for the upload path (defaults to current month, 01-12)

**Features:**
- ✅ Updates all `<img src>` attributes in HTML
- ✅ Matches downloaded images using mapping file
- ✅ Falls back to filename extraction for unmapped images
- ✅ Preserves image alt text and other attributes
- ✅ Settings saved and reused across runs

**Environment Variables:**
You can also set these via `.env` to skip prompts:
```bash
DEALER_SLUG=albanytoyota
IMAGE_YEAR=2025
IMAGE_MONTH=01
```

### Slug Generation

File-based URLs are converted to clean WordPress slugs:
- `www.example.com_2025-ford-f150-review.html` → `2025-ford-f150-review`
- Removes domain and file extensions
- Creates SEO-friendly permalinks

### Article Date Extraction

The CSV generator automatically extracts publish dates from article content to preserve the original publication date when importing to WordPress:

**Supported Date Selectors** (in order of priority):
- `.article-date` - Common blog date class
- `.post-date` - WordPress-style date class
- `.published` - Publishing timestamp class
- `.date` - Generic date class
- `.entry-date` - Entry metadata class
- `time[datetime]` - HTML5 time elements with datetime attribute
- Any element with `date` or `published` in the class name

**Supported Date Formats:**
- **ISO 8601**: `2023-03-08` or `2023-03-08T12:00:00`
- **US Format**: `March 8, 2023` or `03/08/2023`
- **European Format**: `8 March 2023`
- **Datetime attributes**: Preferred format for accuracy

**Fallback Behavior:**
- If no date is found → Uses current date/time
- If date parsing fails → Uses current date/time
- Outputs MySQL datetime format: `YYYY-MM-DD HH:MM:SS`

**Example:**
```html
<!-- In scraped HTML -->
<h3 class="article-date">March 8, 2023</h3>

<!-- Results in CSV -->
post_date: "2023-03-08 00:00:00"
```

**Note:** Date extraction works on the original scraped HTML before class removal, ensuring dates are captured even if they're removed during processing.

## 📊 Error Handling and Monitoring

### Error Categories

1. **ScraperError**: Network, timeout, or page load issues
2. **ProcessingError**: HTML parsing or file system problems
3. **CSVGenerationError**: Data formatting or output issues
4. **General Errors**: Unexpected system errors

### Retry Mechanisms

- **Exponential Backoff**: Increasing delays between retries
- **Circuit Breaker**: Stops retrying after consecutive failures
- **Graceful Degradation**: Continues processing other items

### Progress Tracking

Real-time feedback with:
- Progress bars for long operations
- Detailed status messages
- Success/failure counts
- Performance metrics

## 🐛 Troubleshooting

### Common Issues

**"No URLs to scrape"**
- Check that `data/urls.txt` exists and contains valid URLs
- Ensure URLs are one per line with no extra spaces

**"Cloudflare blocked request"**
- The scraper includes Cloudflare bypass techniques
- If persistent, try reducing concurrency or adding delays

**"Content type detection incorrect"**
- Review your custom selectors in `data/custom-selectors.json`
- Use browser developer tools to find unique class names
- Test with a small sample first

**"Images not downloading"**
- Check `IMAGES_ENABLED=true` in configuration
- Verify network connectivity and image URLs
- Review console output for specific error messages

**"HTML elements still present after cleaning"**
- The aggressive cleaning removes most elements
- Some content-specific elements may need custom rules
- Check the processor configuration for your use case

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm start
```

### Log Analysis

Check logs in the `logs/` directory:
- `combined.log`: All activity
- `error.log`: Errors only

## 🔧 Expansion & Customization

### Current Limitations

- **Hardcoded link patterns** optimized for automotive websites
- **Content detection rules** specific to dealership blog structures  
- **Cleanup patterns** targeting common dealership CMS elements
- **URL structures** assuming automotive comparison pages

### Adaptation Required For:

#### Different Dealer Groups
- **GM, Toyota, Honda, etc.**: Different URL patterns and content structures
- **Multi-brand dealers**: Mixed content types and navigation patterns
- **Independent dealers**: Varying CMS platforms and customizations

### Required Customizations

#### 1. Link Pattern Updates (`src/core/processor.js`)
```javascript
// Current
if (hrefLower.includes('new')) {
  newHref = '/new-vehicles/';
}

// Needs expansion for other slug types
if (hrefLower.includes('new')) {
  newHref = this.config.linkMappings?.new || '/new-vehicles/';
}
```

#### 2. Content Detection Rules (`src/core/csv-generator.js`)
```javascript
// Add brand-specific selectors
const brandSpecificSelectors = {
  'ford': { post: 'post-navigation', page: 'page-header' },
  'gm': { post: 'blog-meta', page: 'static-content' },
  'toyota': { post: 'article-info', page: 'page-content' }
};
```

#### 3. Cleanup Patterns (`src/core/processor.js`)
```javascript
// Expand blog element patterns
const dealerSpecificPatterns = {
  'ford': ['Recent Blog Entries', 'Essential Ford'],
  'gm': ['Latest News', 'Chevy Updates'],
  'toyota': ['Toyota News', 'Recent Articles']
};
```

### Extension Points

#### Configuration-Based Customization
```javascript
// config/dealerTypes.js
export const DEALER_CONFIGS = {
  ford: {
    linkMappings: { new: '/new-vehicles/', used: '/used-vehicles/' },
    contentSelectors: { post: 'post-navigation' },
    cleanupPatterns: ['Recent Blog Entries', 'Connect with us']
  },
  gm: {
    linkMappings: { new: '/new-inventory/', used: '/pre-owned/' },
    contentSelectors: { post: 'blog-nav' },
    cleanupPatterns: ['Latest Updates', 'Follow GM']
  }
};
```

#### Plugin Architecture

Future enhancements could include:

- **Brand-specific plugins**: Modular processors for different dealers
- **CMS adapters**: Specialized handlers for WordPress
- **Content type extensions**: Custom rules for reviews, specifications, etc.

### Contributing New Dealer Support

To add support for a new dealer group or OEM:

1. **Analyze target websites**: Document content structures and patterns
2. **Create configuration profiles**: Define selectors and cleanup rules
3. **Test thoroughly**: Verify content quality and link accuracy
4. **Document patterns**: Help others understand the customizations
5. **Submit improvements**: Contribute back to the main codebase

### Future Roadmap

- [ ] **Multi-brand configuration system**
- [ ] **Visual selector picker tool**
- [ ] **Content structure analysis dashboard**
- [ ] **A/B testing for cleanup effectiveness**
- [ ] **Machine learning content classification**
- [ ] **Real-time content preview**

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


### WordPress Plugin Requirements
- **Really Simple CSV Importer**: v1.3+ by Takuro Hishikawa
- **WordPress**: 5.0+ recommended
- **PHP**: 7.4+ for optimal performance

### Getting Help
- **Issues**: [Report bugs and feature requests](issues)
- **Discussions**: [Community support and questions](discussions)
- **Documentation**: [Wiki and guides](wiki)
- **Plugin Support**: [Really Simple CSV Importer Support](https://wordpress.org/support/plugin/really-simple-csv-importer/)
- **Contact**: Content Automation Team

---

**⚡ Built for the modern web** | **🚀 Enterprise-ready** | **🔧 Highly customizable**

> **Note**: This system represents a foundation that requires customization for different dealer groups, OEMs, and website structures. We welcome contributions that extend its capabilities and improve its adaptability to diverse content automation needs.
