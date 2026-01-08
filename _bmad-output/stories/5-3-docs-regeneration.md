# Story 5.3: Add Documentation Regeneration Step

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want documentation automatically regenerated on release,
so that docs stay synchronized with code without manual updates.

## Acceptance Criteria

1. **Given** the version has been bumped in the release workflow (from Story 5.2)
2. **When** I add the documentation regeneration step to the release workflow
3. **Then** the workflow runs `npm run docs:generate` (FR14)
4. **And** the script attempts to run the BMM `document-project` workflow via Claude CLI (ARCH6)
5. **And** if Claude CLI is not available, the step outputs a warning but doesn't fail (NFR9 - Graceful Degradation)
6. **And** the step uses `continue-on-error: true` for robustness (NFR9)
7. **And** the contents of `_bmad-output/docs/` are synchronized to the `docs/` directory if updates occurred (FR16, ARCH7)
8. **And** any changes to `docs/` are staged for the subsequent release commit (Story 5.4)

## Tasks / Subtasks

- [x] Task 1: Update package.json documentation script (AC: 3)
  - [x] Subtask 1.1: Implement a functional `docs:generate` script in `package.json`
  - [x] Subtask 1.2: The script should invoke the BMAD `document-project` workflow if possible
  - [x] Subtask 1.3: Add a fallback behavior (e.g., echo message) if BMAD tools are missing

- [x] Task 2: Integrate documentation regeneration into Release workflow (AC: 2, 4-6)
  - [x] Subtask 2.1: Open `.github/workflows/release.yml`
  - [x] Subtask 2.2: Add "Regenerate Documentation" step after version bump
  - [x] Subtask 2.3: Configure the step to run `npm run docs:generate`
  - [x] Subtask 2.4: Set `continue-on-error: true` for this step

- [x] Task 3: Implement directory synchronization (AC: 7-8)
  - [x] Subtask 3.1: Add a step to sync `_bmad-output/docs/` to `docs/`
  - [x] Subtask 3.2: Use `rsync -av --delete _bmad-output/docs/ docs/` or a custom Node.js script for cross-platform compatibility
  - [x] Subtask 3.3: Verify that newly generated docs are captured by `git add` in the next story

## Dev Notes

- **Documentation Validation Connection**: This story completes the loop started in Epic 2. While Story 2.2 *validates* that docs are updated before push, this story *automatically generates* them for the official release.
- **BMM Integration**: Uses `ARCH6` (BMM workflow integration). The developer should check for the existence of `claude` or `npx claude` before calling.
- **Robustness**: Per `NFR9`, the release must not fail just because documentation could not be regenerated (e.g., CI environment lacks BMM tools).

### Project Structure Notes

- **Source Folders**:
  - `_bmad-output/docs/`: Source of truth for generated docs.
  - `docs/`: Public-facing documentation directory (synced from `_bmad-output/docs/`).
- **Critical Files (ARCH9)**: Any changes in `src/core/`, `src/app/`, `prisma/schema.prisma`, `package.json`, or `src/config/` should trigger regeneration.

### References

- [Source: _bmad-output/epics.md#Story 5.3: Add Documentation Regeneration Step]
- [Source: _bmad-output/architecture.md#Infrastructure & Deployment]
- [Source: _bmad-output/project-context.md#Critical Implementation Rule 6]
- [Reference Story 2.2: Documentation Validation](file:///Users/nathanhart/Desktop/projects/wp-content-automation/_bmad-output/stories/2-2-documentation-validation-script.md)

## Dev Agent Record

**Review Summary**
- Story: 5.3
- Git vs Story discrepancies: 0
- Issues: 0/0/0
- Verification status: verified

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

N/A

### Completion Notes List

- ✅ Created comprehensive documentation generation script at `scripts/generate-docs.js`
- ✅ Script intelligently detects BMAD CLI availability and gracefully falls back with warnings
- ✅ Updated package.json to replace placeholder `docs` script with functional `docs:generate` script
- ✅ Integrated documentation regeneration into release workflow after version bump
- ✅ Added directory synchronization step to copy `_bmad-output/docs/` to `docs/` directory
- ✅ Both new steps use `continue-on-error: true` for robustness (NFR9)
- ✅ Created comprehensive test suite with 7 test cases covering all acceptance criteria
- ✅ All tests passing (177/177) with no regressions introduced
- ✅ Implementation follows red-green-refactor TDD cycle

### File List
- `_bmad-output/stories/5-3-docs-regeneration.md` (modified)
- `package.json` (modified - added docs:generate script)
- `.github/workflows/release.yml` (modified - added documentation steps)
- `scripts/generate-docs.js` (new - documentation generation script)
- `tests/infrastructure/docs-generation.test.js` (new - comprehensive test suite)
