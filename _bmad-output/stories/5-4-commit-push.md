# Story 5.4: Commit Version Bump and Push Changes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want version changes committed and pushed back to main automatically,
so that the repository reflects the new release version.

## Acceptance Criteria

**Given** version has been bumped and docs regenerated (Stories 5.2, 5.3)
**When** I add commit and push steps to `.github/workflows/release.yml`
**Then** the workflow runs `git add .` to stage all changes (package files, CHANGELOG.md, and docs)
**And** the workflow commits with message `"chore(release): v${{ steps.version.outputs.new_version }} [skip ci]"`
**And** the `[skip ci]` tag prevents infinite workflow loops
**And** if no changes exist, the commit step doesn't fail (echoes "No changes to commit")
**And** the workflow creates an annotated git tag with `git tag -a v${{ steps.version.outputs.new_version }} -m "Release v${{ steps.version.outputs.new_version }}"` (FR9)
**And** the workflow pushes changes and tags with `git push origin main --follow-tags`

## Tasks / Subtasks

- [x] Task 1: Add commit and tag steps to release workflow (AC: 1-5)
  - [x] Subtask 1.1: Edit `.github/workflows/release.yml` to add "Commit and tag release" step
  - [x] Subtask 1.2: Configure git user as "github-actions[bot]" (should be in Story 5.1/Skeleton)
  - [x] Subtask 1.3: Implement logic to handle "nothing to commit" scenarios
  - [x] Subtask 1.4: Ensure `[skip ci]` is in the commit message
  - [x] Subtask 1.5: Verify the annotated tag format

- [x] Task 2: Implement push logic (AC: 6)
  - [x] Subtask 2.1: Add "Push changes" step using `--follow-tags`
  - [x] Subtask 2.2: Ensure the workflow has `contents: write` permissions (FR15/ARCH)

## Dev Notes

**Epic Context:** This is Story 5.4 in Epic 5 (Automated Release & Documentation Pipeline). It is the penultimate step in the automated release flow.

**Story Dependencies:**
- **Story 5.1 (READY):** Release workflow skeleton
- **Story 5.2 (BACKLOG):** Version bump logic (provides `new_version` output)
- **Story 5.3 (BACKLOG):** Documentation regeneration

**Functional Requirements Covered:**
- **FR9:** System must create git tags for each version release
- **FR13:** System must automatically bump version on merge to main branch (completion of the bump)

**Non-Functional Requirements:**
- **NFR9:** System must gracefully handle edge cases (no changes to commit)

### Architecture Compliance

**Git Operations:**
- User: `github-actions[bot]`
- Branch: `main`
- Tag Format: `v{version}`
- Commit Message: `chore(release): v{version} [skip ci]`

### Technical Design

**Proposed Step Configuration:**

```yaml
      - name: Commit and tag release
        run: |
          git add .
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore(release): v${{ steps.version.outputs.new_version }} [skip ci]"
            git tag -a v${{ steps.version.outputs.new_version }} -m "Release v${{ steps.version.outputs.new_version }}"
          fi

      - name: Push changes
        run: git push origin main --follow-tags
```

**Implementation Considerations:**
- Ensure `steps.version.outputs.new_version` matches the ID used in Story 5.2.
- The `contents: write` permission is mandatory for GHA to push back to the repo.
- `[skip ci]` is essential to prevent the release commit from triggering another release workflow.

### References

- [Source: _bmad-output/epics.md#Story 5.4: Commit Version Bump and Push Changes]
- [Source: _bmad-output/architecture.md#CI/CD Automation]

## Review Corrections (Code Review)
- **Claimed:** `[skip ci]` prevents infinite workflow loops.
  **Actual:** GitHub Actions does not honor `[skip ci]` by default, so the release commit would retrigger the workflow.
  **Fix Applied:** Added a job-level guard in `.github/workflows/release.yml` to skip execution when the head commit includes `[skip ci]`.
  **Evidence:** `.github/workflows/release.yml:16`

## Dev Agent Record

**Review Summary**
- Story: 5.4
- Git vs Story discrepancies: 1
- Issues: 1/0/0
- Verification status: verified

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

None

### Completion Notes List

**Implementation Summary:**
- ✅ Added "Commit and tag release" step to release workflow after version extraction
- ✅ Implemented git staging with `git add .`
- ✅ Added conditional logic using `git diff --staged --quiet` to handle "no changes to commit" scenario gracefully
- ✅ Commit message follows required format: `chore(release): v{version} [skip ci]`
- ✅ `[skip ci]` tag prevents infinite workflow loops
- ✅ Created annotated git tag with format: `v{version}` and descriptive message
- ✅ Added "Push changes" step with `--follow-tags` flag to push commits and tags atomically
- ✅ Verified `contents: write` permission already exists in workflow (set in Story 5.1)

**Test Coverage:**
- ✅ Added 15 comprehensive tests for Story 5.4 covering all acceptance criteria
- ✅ Tests validate commit/tag step, push step, error handling, and edge cases
- ✅ All tests pass successfully
- ✅ No regressions introduced in existing tests

**Technical Decisions:**
- Used `steps.extract_version.outputs.version` (from Story 5.2) for consistent version reference
- Conditional commit logic prevents workflow failure when no changes exist (NFR9 compliance)
- Annotated tags provide better git history and release tracking

### File List
- `.github/workflows/release.yml` (modified)
- `tests/infrastructure/github-actions.test.js` (modified)

## Change Log

- **2026-01-07**: Code review fixes applied
  - Added workflow guard to prevent release commit loops despite `[skip ci]`
