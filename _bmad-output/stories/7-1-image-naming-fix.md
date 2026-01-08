# Story 7.1: Image Naming Convention Fix & Enhancement

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **content automation operator**,
I want **image filenames to use clean article slugs instead of full URL paths**,
so that **WordPress media gallery uploads work correctly and filenames are human-readable**.

## Acceptance Criteria

1. **AC1 - Clean Filenames:** Given a scraped article URL like `www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm.html`, When images are downloaded, Then filenames should be `{clean-slug}_{original-name}.{ext}` without `.htm` (e.g., `best-2026-nissan-suvs_1f1d5e0f186f455c8d35de574e8e6f19.jpg`)

2. **AC2 - Updated Mapping:** Given an image mapping file, When a download completes, Then the mapping should include `articleSlug`, `localFilename`, `originalUrl`, `sourceFile`, `size`, and `alt` fields

3. **AC3 - Processor Integration:** Given processed content with image references, When the processor runs, Then image `src` attributes should use the new clean filenames from the mapping

4. **AC4 - Metadata Embedding Required:** Given exiftool IS installed (prerequisite), When images with alt text are downloaded, Then IPTC metadata should be embedded so WordPress displays the caption

## Tasks / Subtasks

- [ ] **Task 1: Create slug extraction helper** (AC: 1)
  - [ ] Add `_extractArticleSlug(sourceFile)` method to ImageDownloaderService
  - [ ] Remove domain prefix (everything before first `_blog_` or first content segment)
  - [ ] Remove date patterns (YYYY, month names like "december", day numbers)
  - [ ] Remove `.htm`, `.html` extensions
  - [ ] Clean special characters, replace with hyphens
  - [ ] Truncate to 50 chars max, ensure WordPress-safe characters only

- [ ] **Task 2: Update `_generateImageFilename()` method** (AC: 1)
  - [ ] Replace `sourceBase` usage with `_extractArticleSlug()` result
  - [ ] Format: `{articleSlug}_{originalImageName}{extension}`
  - [ ] Handle edge cases: no slug found → fallback to hash prefix
  - [ ] Maintain original image name from URL for uniqueness

- [ ] **Task 3: Update image mapping structure** (AC: 2)
  - [ ] Add `articleSlug` field to each mapping entry
  - [ ] Ensure `alt` text is included in mapping
  - [ ] Update `downloadAllImages()` to include new fields in results
  - [ ] Verify mapping JSON writes correctly with new structure

- [ ] **Task 4: Update processor image reference handling** (AC: 3)
  - [ ] Verify `_updateImageReferences()` in processor.js reads mapping correctly
  - [ ] Update image `src` replacement logic if needed
  - [ ] Test end-to-end: download → mapping → processor → clean HTML

- [ ] **Task 5: Integrate metadata embedding** (AC: 4)
  - [ ] Install exiftool: `brew install exiftool` (macOS) — document as prerequisite
  - [ ] Add `_embedMetadata(filePath, altText)` method (from feature branch commit `f60f7d9`)
  - [ ] Add `_checkExiftoolAvailable()` startup check (fail fast if missing)
  - [ ] Call `_embedMetadata()` after successful download if alt text exists
  - [ ] Embed as IPTC:Caption-Abstract, IPTC:Headline, XMP:Description

- [ ] **Task 6: Write unit tests** (AC: 1, 2, 4)
  - [ ] Test `_extractArticleSlug()` with various URL formats
  - [ ] Test filename generation with edge cases (no slug, special chars, very long)
  - [ ] Test mapping structure validation
  - [ ] Test `_checkExiftoolAvailable()` detection
  - [ ] Test `_embedMetadata()` success path
  - [ ] Add tests to `tests/unit/` directory

## Dev Notes

### Critical Architecture Compliance

**File Locations (from project-context.md):**
- Main file to modify: `src/core/image-downloader.js`
- Secondary file: `src/core/processor.js`
- Test files: `tests/unit/image-downloader.test.js`
- Config: `src/config/index.js` (if new config options needed)

**Service Pattern (MUST follow):**
```javascript
// Private methods prefixed with _
_extractArticleSlug(sourceFile) { ... }
_embedMetadata(filePath, altText) { ... }
_checkExiftoolAvailable() { ... }

// JSDoc required for all methods
/**
 * Extract clean article slug from source filename
 * @private
 * @param {string} sourceFile - Source HTML filename
 * @returns {string} Clean article slug
 */
```

**Error Handling (from project-context.md Rule #7):**
- Use `ImageDownloadError` for download failures
- Wrap exiftool calls in try-catch, log warning on failure (graceful degradation)
- Never let metadata embedding failure break the download pipeline

**Naming Conventions (Rule #8):**
- camelCase for new methods: `_extractArticleSlug`, `_embedMetadata`
- camelCase for variables: `articleSlug`, `cleanSlug`
- No PascalCase except for class names

### Slug Extraction Algorithm

```javascript
_extractArticleSlug(sourceFile) {
  // Input: "www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm.html"
  
  let slug = sourceFile;
  
  // 1. Remove .html extension
  slug = slug.replace(/\.html?$/i, '');
  
  // 2. Remove .htm that might be embedded
  slug = slug.replace(/\.htm$/i, '');
  
  // 3. Split by underscore and find the article part
  const parts = slug.split('_');
  
  // 4. Remove domain (first part with dots)
  // 5. Remove date parts (blog, YYYY, month names, day numbers)
  const datePatterns = /^(blog|20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})$/i;
  
  const meaningful = parts.filter(part => 
    !part.includes('.') && // not domain
    !datePatterns.test(part) // not date
  );
  
  // 6. Join remaining parts
  slug = meaningful.join('-');
  
  // 7. Clean up: replace underscores with hyphens, remove double hyphens
  slug = slug
    .replace(/_/g, '-')
    .replace(/--+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase()
    .substring(0, 50);
  
  // 8. Fallback if empty
  if (!slug || slug.length < 3) {
    // Use hash of original filename
    slug = `img-${sourceFile.substring(0, 8).replace(/[^a-z0-9]/gi, '')}`;
  }
  
  return slug;
}
```

### Feature Branch Reference

The `nate/feature/image-related-updates` branch has been fetched locally with relevant commits:

**Commit `f60f7d9` - Metadata Embedding:**
```javascript
async _embedMetadata(filePath, altText) {
  if (!altText || altText.trim() === '') return false;
  try {
    const safeAlt = altText.replace(/'/g, "'\\''");
    const command = `exiftool -overwrite_original -iptc:Caption-Abstract='${safeAlt}' -iptc:Headline='${safeAlt}' -xmp:Description='${safeAlt}' "${filePath}"`;
    await execAsync(command);
    return true;
  } catch (error) {
    console.warn(`Metadata embedding failed: ${error.message}`);
    return false;
  }
}
```

### Project Structure Notes

- All changes confined to `src/core/` layer (business logic)
- No changes to CLI layer (`src/cli/`) needed
- No database changes required
- No frontend changes required

### Testing Strategy

1. **Unit Tests:** Create `tests/unit/image-downloader.test.js`
   - Test `_extractArticleSlug()` with various inputs
   - Test filename generation with edge cases
   - Mock exiftool for metadata tests

2. **Integration Test:** Run full pipeline with sample HTML
   - Verify filenames in `output/images/`
   - Verify mapping.json structure
   - Verify processed HTML has correct image src

3. **Manual Verification:** 
   - Upload generated images to WordPress
   - Confirm no upload errors
   - Confirm metadata appears in media library

### Dependencies

**Required (already installed):**
- fs-extra ^11.1.1
- JSDOM ^23.2.0

**New Dependencies (may need to add):**
- `child_process` (Node.js built-in) for exiftool execution
- `util` (Node.js built-in) for promisify

**Optional External:**
- `exiftool` - Install with `brew install exiftool` (macOS) or `apt install libimage-exiftool-perl` (Linux)

### References

- [Source: docs/tech-spec-image-naming-fix.md] - Full technical specification
- [Source: _bmad-output/project-context.md] - Implementation rules and patterns
- [Source: src/core/image-downloader.js] - Current implementation
- [Git: nate/feature/image-related-updates] - Feature branch with metadata embedding (commit `f60f7d9`)

## Definition of Done

- [ ] All tasks completed and checked off
- [ ] `exiftool` installed (`brew install exiftool`)
- [ ] Unit tests for `_extractArticleSlug()` passing
- [ ] Unit tests for `_generateImageFilename()` passing
- [ ] Unit tests for metadata embedding passing
- [ ] Integration test: full pipeline produces correct filenames
- [ ] Manual verification: 3+ images uploaded to WordPress successfully
- [ ] Metadata visible in WordPress media library for images with alt text
- [ ] No linting errors (`npm run lint`)
- [ ] Code follows project-context.md conventions

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### File List

**Files to Modify:**
- `src/core/image-downloader.js` - Main implementation (slug extraction, metadata embedding)

**Files to Create:**
- `tests/unit/image-downloader.test.js` - Unit tests for slug extraction

**Files to Verify:**
- `output/images/image-mapping.json` - New structure
- `output/images/*.jpg` - New naming convention

