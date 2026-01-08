# Story 7.2: AVIF/AV1 Image Format Auto-Conversion for WordPress

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **content automation operator**,
I want **all downloaded AVIF/AV1 images automatically converted to JPEG format**,
so that **images can be uploaded to WordPress which doesn't support AVIF format**.

## Acceptance Criteria

1. **AC1 - Auto-Conversion by Default:** Given an image download completes with `.avif` extension, When the download process finishes, Then the image should be automatically converted to JPEG format (`.jpg`)

2. **AC2 - Configurable Behavior:** Given the configuration has `images.autoConvertAvif` option, When set to `false`, Then AVIF images should remain in original format (for non-WordPress use cases)

3. **AC3 - Original File Cleanup:** Given an AVIF image is successfully converted to JPEG, When conversion completes, Then the original `.avif` file should be deleted to avoid duplicates

4. **AC4 - Mapping Accuracy:** Given an AVIF image was converted, When the image mapping is written, Then `localFilename` should reflect the `.jpg` extension (not `.avif`)

5. **AC5 - Graceful Degradation:** Given ImageMagick is not installed, When AVIF conversion is attempted, Then the system should warn once and keep the original `.avif` file (don't fail the pipeline)

6. **AC6 - Conversion Tracking:** Given conversion occurs, When mapping is written, Then a `formatConverted` field should indicate `true` with `originalFormat` set to `avif`

## Tasks / Subtasks

- [x] **Task 1: Move conversion to main download flow** (AC: 1, 3)
  - [x] Extract `_convertAvifToJpeg()` call from `_embedMetadata()` to `downloadAllImages()` batch processing
  - [x] Call conversion AFTER successful download, BEFORE metadata embedding
  - [x] Delete original `.avif` file after successful conversion
  - [x] Return converted filename from download result

- [x] **Task 2: Add configuration option** (AC: 2)
  - [x] Add `autoConvertAvif: true` to `src/config/index.js` under `images` section
  - [x] Default to `true` for WordPress compatibility
  - [x] Support environment variable `IMAGES_AUTO_CONVERT_AVIF=false` to disable

- [x] **Task 3: Update download result handling** (AC: 4, 6)
  - [x] Modify batch processing to track format conversion status
  - [x] Add `formatConverted: boolean` to download result
  - [x] Add `originalFormat: string` when conversion occurred
  - [x] Update mapping JSON structure to include conversion metadata

- [x] **Task 4: Check ImageMagick availability** (AC: 5)
  - [x] Add `_checkImageMagickAvailable()` method (similar pattern to `_checkExiftoolAvailable()`)
  - [x] Cache availability result to avoid repeated checks
  - [x] Log warning once if ImageMagick not found, continue without conversion
  - [x] Include install instructions in warning message

- [x] **Task 5: Refactor `_convertAvifToJpeg()` method** (AC: 1, 3, 4)
  - [x] Remove conversion logic from inside `_embedMetadata()`
  - [x] Make conversion method return new filename (not just path)
  - [x] Update method JSDoc to reflect standalone usage
  - [x] Ensure method is idempotent (safe to call on non-AVIF files)

- [x] **Task 6: Update `_generateImageFilename()` for conversion awareness** (AC: 4)
  - [x] Modify filename generation to account for pending AVIF→JPEG conversion
  - [x] Return `.jpg` extension when `autoConvertAvif` is enabled and source is `.avif`
  - [x] Ensure download writes with correct final extension

- [x] **Task 7: Write unit tests** (AC: 1, 2, 4, 5, 6)
  - [x] Test auto-conversion with `autoConvertAvif: true`
  - [x] Test disabled conversion with `autoConvertAvif: false`
  - [x] Test ImageMagick availability detection
  - [x] Test mapping includes `formatConverted` and `originalFormat` fields
  - [x] Test graceful degradation when ImageMagick unavailable

## Dev Notes

### Critical Implementation Details

**Current Problem:**
The existing `_convertAvifToJpeg()` method (lines 102-131 in `image-downloader.js`) is only called inside `_embedMetadata()`, which means:
- Conversion only happens when there's alt text AND exiftool is available
- Most AVIF images are NOT converted, breaking WordPress uploads

**Solution Architecture:**
```javascript
// In downloadAllImages() batch processing, AFTER download completes:
const batchPromises = batch.map(async (imageInfo) => {
  // ... existing download logic ...
  
  const downloadResult = await this._downloadImage(imageInfo, filename, outputPath);
  
  // NEW: Auto-convert AVIF if enabled
  if (downloadResult.success && this.config.autoConvertAvif) {
    const ext = path.extname(downloadResult.filename).toLowerCase();
    if (ext === '.avif') {
      const convertResult = await this._convertAvifToJpeg(path.join(outputDir, downloadResult.filename));
      if (convertResult.success) {
        downloadResult.filename = convertResult.newFilename;
        downloadResult.formatConverted = true;
        downloadResult.originalFormat = 'avif';
      }
    }
  }
  
  // Then embed metadata (now works on .jpg file)
  if (downloadResult.success && imageInfo.alt) {
    await this._embedMetadata(path.join(outputDir, downloadResult.filename), imageInfo.alt);
  }
  
  return downloadResult;
});
```

### Configuration Schema

```javascript
// src/config/index.js - images section
images: {
  enabled: true,
  maxConcurrent: 5,
  timeout: 30000,
  retryAttempts: 3,
  autoConvertAvif: true, // NEW: Convert AVIF to JPEG by default
  allowedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  // ...
}
```

### Mapping JSON Structure Update

```json
{
  "images": [
    {
      "originalUrl": "https://example.com/image.avif",
      "localFilename": "article-slug_image.jpg",
      "articleSlug": "article-slug",
      "sourceFile": "www.example.com_article.html",
      "size": 245678,
      "alt": "Description text",
      "skipped": false,
      "metadataEmbedded": true,
      "formatConverted": true,
      "originalFormat": "avif"
    }
  ]
}
```

### ImageMagick Detection Pattern

```javascript
/**
 * Check if ImageMagick convert command is available
 * @private
 * @returns {Promise<boolean>} True if ImageMagick is installed
 */
async _checkImageMagickAvailable() {
  if (this.imageMagickAvailable !== null) {
    return this.imageMagickAvailable;
  }
  
  try {
    await execAsync('convert -version');
    this.imageMagickAvailable = true;
    console.log('   ✅ ImageMagick detected - AVIF conversion enabled');
    return true;
  } catch (error) {
    this.imageMagickAvailable = false;
    console.warn('   ⚠️  ImageMagick not found - AVIF images will not be converted');
    console.warn('   💡 Install with: brew install imagemagick (macOS) or apt install imagemagick (Linux)');
    return false;
  }
}
```

### Refactored `_convertAvifToJpeg()` Method

```javascript
/**
 * Convert AVIF image to JPEG for WordPress compatibility
 * @private
 * @param {string} filePath - Path to the AVIF image file
 * @returns {Promise<{success: boolean, newFilename?: string, newPath?: string, error?: string}>}
 */
async _convertAvifToJpeg(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  // Skip non-AVIF files
  if (ext !== '.avif') {
    return { success: false, error: 'Not an AVIF file' };
  }
  
  // Check ImageMagick availability
  const available = await this._checkImageMagickAvailable();
  if (!available) {
    return { success: false, error: 'ImageMagick not available' };
  }
  
  try {
    const jpegPath = filePath.replace(/\.avif$/i, '.jpg');
    const jpegFilename = path.basename(jpegPath);
    
    await execAsync(`convert "${filePath}" "${jpegPath}"`);
    
    // Remove original AVIF file
    await fs.unlink(filePath);
    
    console.log(`   🔄 Converted AVIF → JPEG: ${jpegFilename}`);
    
    return {
      success: true,
      newFilename: jpegFilename,
      newPath: jpegPath
    };
  } catch (error) {
    console.warn(`   ⚠️  AVIF conversion failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

### Project Structure Notes

**Files to Modify:**
- `src/core/image-downloader.js` - Main implementation
- `src/config/index.js` - Add `autoConvertAvif` config option
- `tests/unit/core/image-downloader.test.js` - Add unit tests

**Files Unchanged:**
- `src/core/processor.js` - Already uses mapping's `localFilename` field
- `src/cli/automation.js` - No changes needed

### Testing Strategy

1. **Unit Tests:**
   - Mock `execAsync` to simulate ImageMagick presence/absence
   - Test config override with `autoConvertAvif: false`
   - Test mapping output structure

2. **Integration Test:**
   - Download actual AVIF image from test URL
   - Verify `.jpg` file exists, `.avif` deleted
   - Verify mapping shows `formatConverted: true`

3. **Manual Verification:**
   - Run pipeline on real dealer content with AVIF images
   - Upload resulting images to WordPress
   - Confirm no upload errors for converted files

### Dependencies

**Required External Tool:**
- **ImageMagick** - `brew install imagemagick` (macOS) or `apt install imagemagick` (Linux)
- Provides `convert` command for AVIF → JPEG conversion

**Why ImageMagick?**
- Node.js native image libraries have limited AVIF support
- ImageMagick handles AVIF codec automatically with libheif support
- Same tool already used in Story 7-1's metadata embedding

### Previous Story Intelligence

**From Story 7-1 (done):**
- `_convertAvifToJpeg()` method already exists but is poorly integrated
- Method is called inside `_embedMetadata()` which is wrong location
- Metadata embedding fails for AVIF without conversion (correct observation)
- The conversion-in-metadata-embedding pattern was a workaround, not the solution

**Key Learning:** The original implementation tried to solve WordPress incompatibility through metadata embedding flow, but this misses images without alt text. The proper solution is to convert ALL AVIF images by default during the main download flow.

### References

- [Source: src/core/image-downloader.js:102-131] - Existing `_convertAvifToJpeg()` implementation
- [Source: src/core/image-downloader.js:153-164] - Current (wrong) location of conversion call
- [Source: _bmad-output/stories/7-1-image-naming-fix.md] - Previous story context
- [WordPress: Media Library Supported Formats](https://developer.wordpress.org/advanced-administration/wordpress/media-upload/) - WordPress officially does NOT support AVIF

### Definition of Done

- [x] All AVIF images converted to JPEG by default
- [x] Configuration option `autoConvertAvif` available (default: true)
- [x] ImageMagick availability checked with graceful degradation
- [x] Image mapping includes `formatConverted` and `originalFormat` fields
- [x] Unit tests passing for all acceptance criteria (47 tests pass)
- [x] No linting errors (`npm run lint`)
- [x] Manual verification: AVIF source → JPEG output → WordPress upload success

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-sonnet-4-20250514)

### Debug Log References

- All tests pass including 59 image-downloader tests (47 original + 12 new Content-Type mismatch tests)
- ESLint: 0 errors, 0 warnings
- Test run: `npm test` - All test suites pass

### Completion Notes List

1. **Task 2 (Config)**: Added `autoConvertAvif: true` to DEFAULTS and runtime config with `IMAGES_AUTO_CONVERT_AVIF` env var support
2. **Task 4 (ImageMagick check)**: Implemented `_checkImageMagickAvailable()` with caching and one-time warning display
3. **Task 5 (Refactor conversion)**: Refactored `_convertAvifToJpeg()` to return structured result with `{success, newFilename, newPath, error, skipped}`
4. **Task 6 (Filename awareness)**: Updated `_generateImageFilename()` to return `.jpg` extension for AVIF sources when `autoConvertAvif` is enabled
5. **Task 1 (Main flow)**: Moved AVIF conversion into `downloadAllImages()` batch processing, called AFTER download but BEFORE metadata embedding
6. **Task 3 (Tracking)**: Added `formatConverted` and `originalFormat` fields to download results and mapping JSON
7. **Task 7 (Tests)**: Added 20+ new unit tests covering all ACs including graceful degradation, config override, filename generation, and format tracking

## Senior Developer Review (AI)

**Reviewer:** AI Code Reviewer  
**Date:** 2026-01-08  
**Status:** Issues Found and Fixed

### Review Findings

**Critical Issues Fixed:**

1. **CRITICAL #1-3: AVIF conversion fails when Content-Type doesn't match URL extension**
   - **Problem:** Servers may serve AVIF content with Content-Type `image/avif` but URL extension `.png` (or other). Conversion logic only checked filename extension, missing Content-Type header.
   - **Fix Applied:**
     - Added `image/avif` and `image/avif-sequence` to `_getExtensionFromContentType()` mapping
     - Created `_isAvifFormat()` helper method that checks both filename extension AND Content-Type header
     - Updated conversion detection logic to use `_isAvifFormat()` instead of only checking filename
   - **Files Modified:** `src/core/image-downloader.js` (lines 53-62, 716-730, 976-994)

2. **MEDIUM #1: Missing test coverage for Content-Type mismatch scenarios**
   - **Problem:** No tests covered real-world scenario where URL extension doesn't match actual Content-Type
   - **Fix Applied:** Added comprehensive test suite for Content-Type mismatch scenarios
     - Tests for `.png` URL with `image/avif` Content-Type
     - Tests for `.jpg` URL with `image/avif` Content-Type
     - Tests for URLs with no extension but AVIF Content-Type
     - Tests for Content-Type with charset parameters
   - **Files Modified:** `tests/unit/core/image-downloader.test.js` (added 12 new tests)

**Test Results After Fixes:**
- All 59 tests pass (was 47, added 12 new tests)
- No linting errors
- Real-world scenario validated: File with `.jpg` extension but AVIF content now correctly detected and converted

**Review Outcome:** ✅ Approved after fixes

### File List

**Modified:**
- `src/core/image-downloader.js` - Main implementation: added ImageMagick check, refactored conversion method, updated download flow, added tracking fields, added `_isAvifFormat()` helper, fixed Content-Type detection, added AVIF to `_getExtensionFromContentType()` mapping
- `src/config/index.js` - Added `autoConvertAvif: true` to DEFAULTS and runtime config with env var support
- `tests/unit/core/image-downloader.test.js` - Added comprehensive tests for all new functionality (32+ new tests total, including Content-Type mismatch scenarios)

**Unchanged (as expected):**
- `src/core/processor.js` - Already uses mapping's `localFilename` field
- `src/cli/automation.js` - No changes needed

## Change Log

- 2026-01-08: Implemented Story 7-2 AVIF auto-conversion - all AVIF images now converted to JPEG by default during download flow
- 2026-01-08: [Code Review Fix] Fixed Content-Type detection bug - conversion now works when servers serve AVIF with mismatched URL extensions (e.g., `.png` URL with `image/avif` Content-Type). Added `_isAvifFormat()` helper method and comprehensive test coverage for Content-Type mismatch scenarios.

