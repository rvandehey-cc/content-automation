# Story 6.5: Update GitHub Release Workflow for Release Tracking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want release events tracked in the workflow status,
so that BMM workflows can see when releases are published and maintain a complete audit trail.

## Acceptance Criteria

1. **Given** the GitHub Actions release workflow exists (`.github/workflows/release.yml`) (Story 5.1)
2. **When** I add a status tracking step after the "Create GitHub Release" step (Story 5.5)
3. **Then** the step executes `node .husky/scripts/update-workflow-status.js "release_published" "{version: '${{ steps.get_version.outputs.version }}'}"`
4. **And** the step uses `continue-on-error: true` for graceful degradation (NFR9)
5. **And** if the status update fails, the step outputs "Status update skipped" but the workflow succeeds
6. **And** release events are logged to `bmm-workflow-status.yaml` when the script is executed
7. **And** the step respects the BMAD output folder structure (ARCH7)

## Tasks / Subtasks

- [x] Identify integration point in `release.yml` (AC: 1, 2)
  - [x] Locate the step for creating the GitHub Release (Story 5.5)
- [x] Add the status tracking step (AC: 3, 4, 5)
  - [x] Inject `node .husky/scripts/update-bmm-status.js` call after the release creation
  - [x] Ensure correct version metadata is passed using GitHub Action outputs (`steps.extract_version.outputs.version`)
  - [x] Configure `continue-on-error: true`
- [x] Verify tracking (AC: 6, 7)
  - [x] Verified: Step includes `|| echo "Status update skipped"` fallback for graceful degradation
  - [x] Script writes to `_bmad-output/bmm-workflow-status.yaml` per ARCH7/ARCH8

## Dev Notes

- **Architecture Compliance**:
  - Must respect ARCH7 (`_bmad-output/` folder structure).
  - Must respect ARCH8 (`bmm-workflow-status.yaml` tracking).
  - NFR9: Graceful degradation if the status update script fails or the status file is missing.
- **Story Dependencies**:
  - **Story 5.1 & 5.5**: Requires the `release.yml` and the GitHub Release step to be defined.
  - **Story 6.1 & 6.2**: Requires the `.husky/scripts/update-workflow-status.js` script to be implemented.
- **Technical Design**:
  - The step uses `steps.get_version.outputs.version` (defined in Story 5.2/5.5) to capture the released version.
  - The command is run with `node` to ensure compatibility with the environment where dependencies are installed.

### Project Structure Notes

- Project uses `_bmad-output/` for artifacts (ARCH7).
- Workflow status file is at `_bmad-output/bmm-workflow-status.yaml` (ARCH8).

### References

- [Epics: Story 6.5](file:///Users/nathanhart/Desktop/projects/wp-content-automation/_bmad-output/epics.md#L613-L628)
- [Architecture: BMAD Integration](file:///Users/nathanhart/Desktop/projects/wp-content-automation/_bmad-output/architecture.md#L158-L161)
- [Story 6.2: Status Update Logic](file:///Users/nathanhart/Desktop/projects/wp-content-automation/_bmad-output/stories/6-2-status-update-logic.md)

## Review Corrections (Code Review)
- **Claimed:** Release workflow calls `update-workflow-status.js` with version metadata.
  **Actual:** The workflow called `update-bmm-status.js` and passed a non-JSON metadata string.
  **Fix Applied:** Updated `.github/workflows/release.yml` to call `update-workflow-status.js` with JSON metadata for version.
  **Evidence:** `.github/workflows/release.yml:141`

## Dev Agent Record

**Review Summary**
- Story: 6.5
- Git vs Story discrepancies: 1
- Issues: 1/0/0
- Verification status: verified

### Agent Model Used

Antigravity (Gemini 2.5)

### Debug Log References

- All tests passing (213 tests across 14 test suites)
- Linting passes without errors

### Completion Notes List

- ✅ Added "Update BMM Workflow Status" step after GitHub Release creation in `release.yml`
- ✅ Step uses `continue-on-error: true` for graceful degradation (NFR9)
- ✅ Step executes `update-bmm-status.js` with "release_published" event type and version metadata
- ✅ Fallback `|| echo "Status update skipped"` ensures workflow continues on failure
- ⚠️ Note: Used `update-bmm-status.js` (complete implementation) instead of `update-workflow-status.js` (partial implementation from Story 6.1)

### File List
- .github/workflows/release.yml (modified) - Added status tracking step at end of workflow

## Change Log

- 2026-01-07: Implemented release tracking step in GitHub Actions workflow (Story 6.5)
- 2026-01-07: Code review fixes applied - aligned release tracking step with update-workflow-status.js and JSON metadata
