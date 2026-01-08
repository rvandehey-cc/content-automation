# Story 3.1: Install and Configure Standard-Version

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want standard-version installed and configured,
so that semantic versioning can be automated from conventional commits.

## Acceptance Criteria

**Given** the project uses conventional commits
**When** I install standard-version as a dev dependency
**Then** standard-version package is added to package.json devDependencies
**And** the installation is compatible with Node.js and existing project structure (NFR6)
**And** standard-version is ready to parse conventional commits

## Tasks / Subtasks

- [x] Task 1: Install standard-version package (AC: 1-3)
  - [x] Subtask 1.1: Run `npm install --save-dev standard-version`
  - [x] Subtask 1.2: Verify package appears in package.json devDependencies
  - [x] Subtask 1.3: Verify package-lock.json is updated

- [x] Task 2: Verify compatibility (AC: 4)
  - [x] Subtask 2.1: Check Node.js version compatibility (project requires >=18.0.0)
  - [x] Subtask 2.2: Verify no conflicts with existing dependencies
  - [x] Subtask 2.3: Test basic functionality with `npx standard-version --help`

## Dev Notes

**Epic Context:** This is Story 3.1, the FIRST story in Epic 3 (Semantic Versioning & Changelog Automation). This epic enables developers to never manually bump versions or write changelogs - the system automatically determines semantic versions from commit messages and generates release notes.

**Epic Dependencies:**
- **Epic 1 (Complete):** Conventional commits are ENFORCED via commitlint in `.husky/commit-msg`
  - This is CRITICAL: standard-version REQUIRES conventional commits to work
  - Commit types defined: feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert
  - Scopes defined: core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation
- **Epic 2 (Complete):** Pre-push hooks validate protected branches
  - Git hooks infrastructure is established via Husky

**Functional Requirements Covered:**
- **FR7:** System must automatically determine version bumps based on conventional commits (feat=minor, fix=patch, BREAKING CHANGE=major)
- **FR8:** System must automatically generate and update CHANGELOG.md from commit messages
- **FR9:** System must create git tags for each version release
\

**Non-Functional Requirements:**
- **NFR6:** All automation must work with existing Node.js/npm project structure without breaking changes
- **NFR8:** Version bumping must be deterministic and predictable based on commit messages
- **NFR10:** All configuration files must be version-controlled and documented

### Architecture Compliance

**Current Project Structure:**
- **Package Manager:** npm (package.json exists, npm scripts established)
- **Node Version:** >=18.0.0 (from package.json engines)
- **Current Version:** 2.0.0 (from package.json line 3)
- **Project Type:** Hybrid - Node.js CLI + Next.js 16 Web Dashboard
- **Module Type:** ESM (`"type": "module"` in package.json)

**Existing DevDependencies to Consider:**
- Husky 9.1.7 (git hooks manager - already working)
- @commitlint/cli 20.3.0 (commit validation - already working)
- Jest 29.7.0 (testing framework)
- ESLint 8.55.0 (linting)

**Installation Safety Checks:**
- ✅ No version conflicts: standard-version has no overlapping dependencies with existing tools
- ✅ Husky compatibility: standard-version works alongside Husky (separate concerns)
- ✅ Commitlint compatibility: standard-version CONSUMES conventional commits that commitlint enforces
- ⚠️ **IMPORTANT:** Do NOT install conflicting tools like `semantic-release` or `release-it` (these would compete with standard-version)

### Project Structure Notes

**Package.json Location:** `/package.json` (project root)

**Current Scripts Pattern (from Story 2.4 learnings):**
- Documentation scripts use descriptive names (e.g., `docs`, `db:generate`)
- Test scripts follow pattern: `test`, `test:watch`, `test:coverage`
- Web-specific scripts namespaced: `dev:web`, `lint:web`, `start:web`
- Database scripts namespaced: `db:generate`, `db:migrate`, `db:studio`

**Expected Pattern for Version Scripts (will be added in Story 3.3):**
- Follow existing namespace pattern
- Will add: `release`, `release:minor`, `release:major`, `release:patch`, `release:dry-run`

### Installation Context

**Why standard-version:**
- Industry standard for conventional commit → semantic version automation
- Used by thousands of projects (Angular, Babel, etc.)
- Integrates seamlessly with commitlint
- Non-invasive: only affects local git (no auto-push/publish)
- Deterministic: same commits = same version bump every time

**What standard-version Does:**
1. Reads conventional commits since last git tag
2. Determines version bump (feat=minor, fix=patch, BREAKING CHANGE=major)
3. Updates version in package.json and package-lock.json
4. Generates/updates CHANGELOG.md
5. Creates git commit with version changes
6. Creates git tag with new version

**What It Does NOT Do (intentionally):**
- Does NOT push to remote (you control when to push)
- Does NOT publish to npm (this is not a package)
- Does NOT require GitHub API tokens
- Does NOT modify code or tests

### Testing Verification

After installation, verify with:
```bash
npx standard-version --help
```

Expected output should show:
- Available commands and options
- Version information
- No error messages

**Do NOT run actual version bump yet** - that happens in Story 3.4 (Generate Initial CHANGELOG.md) using `--first-release` flag.

### References

- [Source: _bmad-output/epics.md#Epic 3: Semantic Versioning & Changelog Automation]
- [Source: _bmad-output/epics.md#Story 3.1: Install and Configure Standard-Version]
- [Source: _bmad-output/architecture.md#CI/CD Automation (FR-CICD-1 through FR-CICD-18)]
- [Source: package.json - Current version 2.0.0, Node >=18.0.0]
- [Source: Story 1.2 - Commitlint configuration with conventional commit types]
- [Source: Story 2.4 - Documentation and git hook patterns established]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

No debug logging required - straightforward dependency installation.

### Completion Notes List

✅ **Task 1 Complete:** Installed standard-version package
- Installed standard-version ^9.5.0 via npm (183 packages added)
- Verified package added to package.json devDependencies (line 82)
- Verified package-lock.json updated (15 references)

✅ **Task 2 Complete:** Verified compatibility
- Node.js v25.2.1 exceeds required >=18.0.0
- No dependency conflicts detected during installation
- Tested `npx standard-version --help` - displays correctly with all options

**All acceptance criteria met:**
- ✅ AC1: standard-version installed as dev dependency
- ✅ AC2: Package added to package.json devDependencies
- ✅ AC3: Installation compatible with Node.js >=18 (running v25.2.1)
- ✅ AC4: standard-version ready to parse conventional commits (help command works)

**Notes:**
- Installed version: ^9.5.0 (latest stable)
- Installation included 183 transitive dependencies
- Some deprecated warnings (q@1.5.1, stringify-package) are from standard-version's dependencies, not breaking issues
- 5 vulnerabilities reported (4 moderate, 1 high) from transitive deps - these are within standard-version's own dependencies and don't affect functionality
- Conventional commits already enforced via commitlint (Epic 1) - standard-version will consume these properly
- Ready for Story 3.2 (Create Version Configuration File)

### File List

- `package.json` (modified) - Added standard-version ^9.5.0 to devDependencies
- `package-lock.json` (modified) - Updated with standard-version and 183 transitive dependencies
