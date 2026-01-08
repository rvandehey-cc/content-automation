# Story 1.2: Configure Commitlint for Conventional Commits

**Status:** done

## Story
As a developer, I want commit messages validated against conventional commit standards, so that all commits follow a consistent, parseable format for automation.

## Acceptance Criteria
- [x] **Given** Husky is installed and configured
- [x] **When** I install @commitlint/cli and @commitlint/config-conventional
- [x] **Then** a `.commitlintrc.json` configuration file is created
- [x] **And** the config defines allowed types: feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert
- [x] **And** the config defines allowed scopes: core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation (FR2, ARCH10)
- [x] **And** commit message rules enforce lowercase subjects and 100 char max length
- [x] **And** a commit-msg hook is created at `.husky/commit-msg` that runs commitlint
- [x] **And** invalid commit messages are blocked with clear error messages (NFR1, NFR2)

## Tasks/Subtasks
- [x] Install @commitlint/cli and @commitlint/config-conventional
- [x] Create `.commitlintrc.json` with conventional commit config
- [x] Define allowed types (feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert)
- [x] Define allowed scopes (core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation)
- [x] Add subject-case and header-max-length rules
- [x] Create `.husky/commit-msg` hook that runs commitlint
- [x] Test with valid commit message
- [x] Test with invalid commit message (should block)

## Dev Notes
- Follow strict Red-Green-Refactor where applicable
- This is infrastructure setup - manual testing required
- BMAD-specific scopes (bmm, workflows, agents, automation) are critical per ARCH10

## Dev Agent Record
### Implementation Plan
- Install commitlint dependencies
- Create configuration file with types and scopes
- Create commit-msg hook
- Validate with test commits

### Completion Notes
- Installed @commitlint/cli and @commitlint/config-conventional
- Created `.commitlintrc.json` with all required types and scopes
- Created `.husky/commit-msg` hook that runs commitlint validation and prints guidance on failure
- Validated with commitlint CLI (equivalent rules used by hook):
  - ✅ Valid: `feat(core): test commit` - passed
  - ❌ Invalid: `Invalid commit message` - blocked with type/subject errors

### Evidence
- Commit: `6201ba1` (adds commitlint deps, config, and commit-msg hook).
- Manual validation:
  - `printf "feat(core): test commit\n" | npx commitlint` → exit 0
  - `printf "Invalid commit message\n" | npx commitlint` → blocked with errors

### Review Integration
- Completion is committed and pushed; reviews should validate against git history (commit hash above).

## File List
- .commitlintrc.json
- .husky/commit-msg
- package.json
- package-lock.json
- _bmad-output/stories/1.2-configure-commitlint.md

## Change Log
- 2026-01-06: Created story file.
- 2026-01-06: Implemented and validated commitlint configuration.
- 2026-01-06: Added evidence and review integration note.
