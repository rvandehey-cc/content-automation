# Tech-Spec: Image Naming Convention Fix & Enhancement

**Created:** 2026-01-08
**Status:** Ready for Development
**Sprint Artifacts:** docs/tech-spec-image-naming-fix.md

## Overview

### Problem Statement

Current image filenames include the full source URL path with `.htm` extension embedded in the filename:
```
www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm_1f1d5e0f186f455c8d35de574e8e6f19.jpg
```

This breaks WordPress media gallery uploads because:
1. The `.htm` extension mid-filename confuses WordPress file validation
2. Filenames are excessively long (100+ characters)
3. Not human-readable or SEO-friendly

### Solution

Implement a new naming convention using **article slug + original image name**:
```
best-2026-nissan-suvs_1f1d5e0f186f455c8d35de574e8e6f19.jpg
```

Additionally, integrate valuable enhancements from the `feature/image-related-updates` branch:
- Metadata embedding with exiftool for WordPress caption support
- Additional link processing patterns (trade, about-us, incentives)

### Scope

**In Scope:**
- [x] Fix `_generateImageFilename()` method in image-downloader.js
- [x] Update image mapping JSON structure
- [x] Update how processor references images in cleaned content
- [x] Integrate metadata embedding from feature branch (optional, requires exiftool)
- [x] Integrate additional link patterns from feature branch

**Out of Scope:**
- WordPress import process changes
- Retroactive renaming of already-downloaded images
- Changes to CSV generator structure

## Context for Development

### Codebase Patterns

**Service Architecture:**
- Services in `src/core/` follow constructor injection pattern
- Private methods prefixed with `_`
- JSDoc documentation required
- Error handling via custom error classes

**Naming Conventions:**
- camelCase for variables/functions
- PascalCase for classes
- Configuration via `src/config/index.js`

### Files to Reference

| File | Purpose |
|------|---------|
| `src/core/image-downloader.js` | Main file to modify - `_generateImageFilename()` |
| `src/core/processor.js` | Updates image `src` attributes using mapping |
| `output/images/image-mapping.json` | Mapping file structure |
| `src/config/index.js` | Configuration for images module |

### Technical Decisions

1. **Slug Extraction Strategy:** Extract meaningful slug from URL path, removing domain, dates, and `.htm` extensions
2. **Fallback Naming:** If slug extraction fails, use short hash prefix + original name
3. **Metadata Embedding:** Make optional (requires exiftool installed) - graceful degradation if not available
4. **Backward Compatibility:** New naming applies to new downloads only

## Implementation Plan

### Tasks

- [ ] **Task 1: Create slug extraction helper**
  - Add `_extractArticleSlug(sourceFile)` method
  - Extract meaningful slug from URL path (e.g., "your-guide-to-the-best-2026-nissan-suvs" → "best-2026-nissan-suvs")
  - Handle edge cases: no slug, special characters, very long slugs
  - Truncate to 50 chars max, clean special characters

- [ ] **Task 2: Update `_generateImageFilename()` method**
  - Replace current logic using `sourceBase` (full URL)
  - Use new `_extractArticleSlug()` for prefix
  - Format: `{articleSlug}_{originalImageName}{extension}`
  - Ensure uniqueness with original image name from URL

- [ ] **Task 3: Update image mapping structure**
  - Add `articleSlug` field to mapping entries
  - Update mapping output format:
    ```json
    {
      "originalUrl": "https://...",
      "localFilename": "best-2026-nissan-suvs_1f1d5e0f186f455c8d35de574e8e6f19.jpg",
      "articleSlug": "best-2026-nissan-suvs",
      "sourceFile": "www.zimbricknissan.com_blog_...",
      "size": 62515,
      "alt": "2026 Nissan SUV"
    }
    ```

- [ ] **Task 4: Update processor image reference handling**
  - Ensure `_updateImageReferences()` in processor.js uses new mapping format
  - Verify image `src` attributes are updated correctly in cleaned content

- [ ] **Task 5: Integrate metadata embedding (from feature branch)**
  - Add `_embedMetadata()` method using exiftool
  - Check for exiftool availability at startup
  - Embed alt text as IPTC:Caption-Abstract for WordPress
  - Log warning if exiftool not installed (graceful degradation)

- [ ] **Task 6: Integrate additional link patterns (from feature branch)**
  - Add `/trade/` → `/value-your-trade/`
  - Add `/about-us/` → `/about-us/`
  - Add `/incentives/` → `/offers-and-incentives/`
  - Add `/hours/` to contact detection

- [ ] **Task 7: Write unit tests**
  - Test slug extraction with various URL formats
  - Test filename generation edge cases
  - Test mapping structure updates

### Acceptance Criteria

- [ ] **AC1:** Given a scraped article URL like `www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm.html`, When images are downloaded, Then filenames should be `{clean-slug}_{original-name}.{ext}` without `.htm`

- [ ] **AC2:** Given an image mapping file, When a download completes, Then the mapping should include `articleSlug`, `localFilename`, `originalUrl`, `sourceFile`, `size`, and `alt` fields

- [ ] **AC3:** Given processed content with image references, When the processor runs, Then image `src` attributes should use the new clean filenames

- [ ] **AC4:** Given exiftool is NOT installed, When images are downloaded, Then the process should complete successfully with a warning (no failure)

- [ ] **AC5:** Given exiftool IS installed, When images with alt text are downloaded, Then IPTC metadata should be embedded so WordPress displays the caption

- [ ] **AC6:** Given content with trade/about/incentive links, When the processor runs, Then these should be mapped to appropriate WordPress URLs

## Additional Context

### Dependencies

**Required:**
- Node.js 18+
- fs-extra
- JSDOM

**Optional (for metadata embedding):**
- exiftool (brew install exiftool / apt install libimage-exiftool-perl)

### Testing Strategy

1. **Unit Tests:** Slug extraction, filename generation, mapping structure
2. **Integration Test:** Full download + process cycle with sample HTML
3. **Manual Verification:** Upload generated images to WordPress media library

### Notes

**Feature Branch Integration:**
The `nate/feature/image-related-updates` branch has been fetched locally. Key commits to reference:
- `f60f7d9` - Metadata embedding with exiftool
- `d5c8d97` - Additional link patterns and excluded container classes

**Slug Extraction Algorithm:**
```javascript
// Example implementation approach
_extractArticleSlug(sourceFile) {
  // Input: "www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm.html"
  
  // 1. Remove domain prefix (first part before _)
  // 2. Remove date patterns (YYYY, month names, day numbers)
  // 3. Remove .htm, .html extensions
  // 4. Extract the meaningful article slug portion
  // 5. Clean and truncate to 50 chars
  
  // Output: "best-2026-nissan-suvs" or similar clean slug
}
```

**WordPress Compatibility:**
- Filenames should use only alphanumeric, hyphens, underscores
- Max recommended length: 100 characters (we target 80)
- No special characters or multiple extensions

---

**Ready for implementation.** Run this spec with quick-dev workflow or start fresh context for best results.

