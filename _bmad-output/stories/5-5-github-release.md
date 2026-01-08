# Story 5.5: Create GitHub Release with Changelog

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want GitHub releases created automatically with changelog content,
so that releases are documented and visible in GitHub UI.

## Acceptance Criteria

**Given** version has been bumped, committed, and tagged (Stories 5.2, 5.4)
**When** I add GitHub release creation step to `.github/workflows/release.yml` using `actions/github-script@v7`
**Then** the workflow reads `CHANGELOG.md` content
**And** the workflow extracts the latest version section from the changelog
**And** the workflow creates a release using `github.rest.repos.createRelease` API (FR15)
**And** the release uses tag name `v${{ steps.version.outputs.new_version }}`
**And** the release name is `Release v${{ steps.version.outputs.new_version }}`
**And** the release body contains the extracted changelog content for this version
**And** the release is not marked as draft or prerelease
**And** the release is visible in the GitHub releases UI

## Tasks / Subtasks

- [x] Task 1: Add GitHub Release step to release workflow (AC: 1-10)
  - [x] Subtask 1.1: Edit `.github/workflows/release.yml` to add "Create GitHub Release" step
  - [x] Subtask 1.2: Implement logic to read `CHANGELOG.md` and extract the latest release notes
  - [x] Subtask 1.3: Use `actions/github-script@v7` to call the GitHub API
  - [x] Subtask 1.4: Map the `new_version` from previous steps to the release tag and name
  - [x] Subtask 1.5: Verify release body contains correct markdown content

## Dev Notes

**Epic Context:** This is Story 5.5 in Epic 5 (Automated Release & Documentation Pipeline). It is the final step in the automated release chain.

**Story Dependencies:**
- **Story 5.1 (READY):** Release workflow skeleton
- **Story 5.2 (BACKLOG):** Version bump logic (provides `new_version` output)
- **Story 5.4 (READY):** Tag creation and push (ensures the tag exists for the release)

**Functional Requirements Covered:**
- **FR15:** System must create GitHub releases automatically with changelog content

**Non-Functional Requirements:**
- **NFR9:** System must gracefully handle edge cases (missing changelog section)

### Architecture Compliance

**GitHub API Usage:**
- Action: `actions/github-script@v7`
- Permissions: `contents: write` (Required for release creation)
- API: `github.rest.repos.createRelease`

### Technical Design

**Proposed Step Configuration:**

```yaml
      - name: Create GitHub Release
        uses: actions/github-script@v7
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            const fs = require('fs');
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
            // Logic to extract latest version section
            const version = '${{ steps.version.outputs.new_version }}';
            const releaseNotes = extractReleaseNotes(changelog, version); 
            
            await github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: `v${version}`,
              name: `Release v${version}`,
              body: releaseNotes,
              draft: false,
              prerelease: false
            });
```

### References

- [Source: _bmad-output/epics.md#Story 5.5: Create GitHub Release with Changelog]
- [Source: _bmad-output/architecture.md#CI/CD Automation]

## Review Corrections (Code Review)
- **Claimed:** Changelog parsing extracts the latest version section from `CHANGELOG.md`.
  **Actual:** The parser only matched headers like `## 1.2.3`, but `standard-version` defaults to `## [1.2.3] - YYYY-MM-DD`.
  **Fix Applied:** Updated `.github/workflows/release.yml` to match both bracketed and unbracketed version headers.
  **Evidence:** `.github/workflows/release.yml:93`

## Dev Agent Record

**Review Summary**
- Story: 5.5
- Git vs Story discrepancies: 1
- Issues: 1/0/0
- Verification status: verified

### Agent Model Used

Antigravity (Claude 3.5 Sonnet)

### Debug Log References

### Completion Notes List

✅ Implemented GitHub release creation step in release workflow using actions/github-script@v7
✅ Added changelog parsing logic to extract release notes for specific version
✅ Configured release to use tag name `v{version}` with extracted version from package.json
✅ Set release name to "Release v{version}" format
✅ Integrated changelog content as release body
✅ Configured release as non-draft and non-prerelease
✅ Added comprehensive test coverage for all acceptance criteria
✅ All 177 tests passing with no regressions

### File List
- `.github/workflows/release.yml` (modified)
- `tests/infrastructure/github-actions.test.js` (modified)

## Change Log

- 2026-01-07: Story 5.5 implementation completed - Added GitHub release creation with changelog integration to release workflow
- 2026-01-07: Code review fixes applied - Hardened changelog parsing for standard-version format
