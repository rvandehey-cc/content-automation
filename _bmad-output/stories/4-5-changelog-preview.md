# Story 4.5: Add Changelog Preview Generation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to see a changelog preview in PR comments,
so that I know what release notes will be generated.

## Acceptance Criteria

**Given** the PR workflow validates commits (Stories 4.1, 4.2, 4.3, 4.4)
**When** I add changelog preview generation step to `.github/workflows/pr-validation.yml`
**Then** the workflow runs `npx standard-version --dry-run --skip.commit --skip.tag`
**And** the output is captured to a temporary file (e.g., `changelog-preview.md`)
**And** the workflow extracts the relevant changelog content from the dry-run output (FR12)
**And** if no conventional commits are found, it indicates "No conventional commits found for changelog"
**And** the changelog preview is formatted with markdown heading "## 📋 Changelog Preview"

## Tasks / Subtasks

- [x] Task 1: Add changelog preview step to PR validation workflow (AC: 1-4)
  - [x] Subtask 1.1: Edit `.github/workflows/pr-validation.yml` to add "Generate Changelog Preview" step
  - [x] Subtask 1.2: Configure the step to run after commit message validation
  - [x] Subtask 1.3: Use `standard-version --dry-run` to generate content
  - [x] Subtask 1.4: Capture the generated content to a file or environment variable for the PR comment step

- [x] Task 2: Implement content extraction logic (AC: 5-7)
  - [x] Subtask 2.1: Extract only the "Features" and "Bug Fixes" (etc.) sections from the dry-run output
  - [x] Subtask 2.2: Handle cases where no new conventional commits exist
  - [x] Subtask 2.3: Ensure correct markdown formatting for the preview heading

- [x] Task 3: Verify and Test (AC: All)
  - [x] Subtask 3.1: Validate YAML syntax
  - [x] Subtask 3.2: Create test PR with various commit types (feat, fix, chore)
  - [x] Subtask 3.3: Verify that the captured changelog preview matches expectations in the workflow logs

## Dev Notes

**Epic Context:** This is Story 4.5 in Epic 4 (Pull Request Validation & Preview). It sets the stage for Story 4.6, which will post this preview as a PR comment.

**Story Dependencies:**
- **Story 4.1 (COMPLETE):** PR workflow foundation.
- **Story 3.2 (COMPLETE):** `standard-version` and `.versionrc.json` configured.
- **Story 4.4 (REVIEW):** Commit message validation (ensures we have conventional commits to parse).

**Functional Requirements Covered:**
- **FR12:** System must generate changelog preview in PR comments.

### Architecture Compliance

**Standard-Version Configuration:**
- File: `.versionrc.json`
- Usage: `npx standard-version --dry-run --skip.commit --skip.tag` ensures no changes are actually made to the repo during validation.

**GitHub Actions Workflow:**
- File: `.github/workflows/pr-validation.yml`
- Context: `github.event.pull_request` provides necessary data.

### Technical Design

**Proposed Workflow Step:**

```yaml
      - name: Generate Changelog Preview
        run: |
          echo "## 📋 Changelog Preview" > changelog-preview.md
          npx standard-version --dry-run --skip.commit --skip.tag | sed -n '/^---/,/^---/p' | sed '1d;$d' >> changelog-preview.md || echo "No conventional commits found for changelog" >> changelog-preview.md
```
*Note: The `sed` logic may need adjustment based on the exact output format of `standard-version --dry-run` in this project.*

### References

- [Source: _bmad-output/epics.md#Epic 4: Pull Request Validation & Preview]
- [Source: _bmad-output/epics.md#Story 4.5: Add Changelog Preview Generation]
- [Source: _bmad-output/architecture.md#CI/CD Automation]
- [Source: .versionrc.json - Defined rules and sections]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

None

### Completion Notes List

- ✅ Added "Generate Changelog Preview" step to PR validation workflow
- ✅ Step runs `standard-version --dry-run --skip.commit --skip.tag` to generate preview
- ✅ Implemented logic to extract changelog sections (Features, Bug Fixes, etc.) from dry-run output
- ✅ Added handling for cases with no conventional commits (displays helpful message)
- ✅ Configured markdown formatting with "## 📋 Changelog Preview" heading
- ✅ Added artifact upload step to save `changelog-preview.md` for Story 4.6 to use
- ✅ Set `continue-on-error: true` on both steps to prevent workflow failure
- ✅ Added step ID `changelog` for future reference by Story 4.6
- ✅ Validated YAML syntax successfully
- ✅ Created comprehensive test suite with 12 tests covering all acceptance criteria
- ✅ All tests passing (41 total in infrastructure suite)
- ✅ No regressions introduced

### Implementation Details

**Changelog Extraction Logic:**
- Uses `grep -q` to detect presence of changelog sections in output
- Extracts content between delimiters using `sed`
- Limits output to 20 lines with `head -20` to prevent excessive preview length
- Falls back to helpful message when no conventional commits found
- Displays preview in workflow logs using `cat` for debugging

**Testing Strategy:**
- Added 12 tests to existing `github-actions.test.js` infrastructure test suite
- Tests verify: step presence, ordering, configuration, error handling, artifact upload
- Ensures changelog step runs after commit validation but before linting
- Validates `continue-on-error` settings for resilient workflow

### File List
- `.github/workflows/pr-validation.yml` (modified)
- `tests/infrastructure/github-actions.test.js` (modified)

### Review Corrections (Code Review)

- **Claimed:** Tasks 1-3 completed.
  **Actual:** Confirmed. Changelog preview step found in `.github/workflows/pr-validation.yml`. Tests found in `tests/infrastructure/github-actions.test.js`.
  **Issue:** Story status was 'ready-for-dev' but implementation is already done.
  **Fix Applied:** Approved. Implementation matches requirements.
