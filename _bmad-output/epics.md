---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories']
inputDocuments:
  - '/Users/nathanhart/.claude/plans/shimmying-hopping-iverson.md'
  - '_bmad-output/architecture.md'
---

# wp-content-automation - Epic Breakdown: CI/CD Automation System

## Overview

This document provides the complete epic and story breakdown for the **CI/CD Automation System**, decomposing the requirements from the automation implementation plan and project architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR1:** System must enforce conventional commit message format on all commits
**FR2:** System must validate commit messages against defined types (feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert) and scopes (core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation)
**FR3:** System must run linting checks (ESLint) before commits are allowed
**FR4:** System must run unit tests (Jest) before commits are allowed
**FR5:** System must run full test suite with coverage before pushes to protected branches (main/dev)
**FR6:** System must validate documentation synchronization when architecture files change
**FR7:** System must automatically determine version bumps based on conventional commits (feat=minor, fix=patch, BREAKING CHANGE=major)
**FR8:** System must automatically generate and update CHANGELOG.md from commit messages
**FR9:** System must create git tags for each version release
**FR10:** System must trigger PR validation on GitHub when PRs are opened/updated to main/dev branches
**FR11:** System must run linting and tests in CI/CD pipeline for all PRs
**FR12:** System must generate changelog preview in PR comments
**FR13:** System must automatically bump version on merge to main branch
**FR14:** System must regenerate documentation using BMM document-project workflow on release
**FR15:** System must create GitHub releases automatically with changelog content
**FR16:** System must sync _bmad-output/docs/ to docs/ directory after documentation generation
**FR17:** System must track automation events (commits, pushes, releases) in BMM workflow status file
**FR18:** System must allow emergency bypass of hooks using --no-verify flag

### NonFunctional Requirements

**NFR1:** Git hooks must block commits/pushes that fail validation (blocking enforcement level)
**NFR2:** System must provide clear, actionable error messages when validation fails
**NFR3:** Documentation validation must map critical files to required documentation updates
**NFR4:** System must be maintainable by intermediate-level developers
**NFR5:** CI/CD workflows must minimize costs by running only when needed
**NFR6:** All automation must work with existing Node.js/npm project structure without breaking changes
**NFR7:** System must not disrupt existing development workflow
**NFR8:** Version bumping must be deterministic and predictable based on commit messages
**NFR9:** System must gracefully handle edge cases (merge conflicts, failed doc generation, missing dependencies)
**NFR10:** All configuration files must be version-controlled and documented

### Additional Requirements

**ARCH1:** Integration with Next.js 16 web dashboard (existing architecture)
**ARCH2:** Persistence layer uses Prisma ORM with Supabase PostgreSQL (existing)
**ARCH3:** Execution layer includes Node.js CLI with core services (existing)
**ARCH4:** Async job layer uses BullMQ/Redis (existing)
**ARCH5:** Configuration uses singleton pattern (must respect)
**ARCH6:** BMM workflow integration required for document-project workflow
**ARCH7:** Must respect _bmad-output/ folder structure for all artifacts
**ARCH8:** Must integrate with bmm-workflow-status.yaml for status tracking
**ARCH9:** Validation must check critical files: src/core/, src/app/, prisma/schema.prisma, package.json, src/config/
**ARCH10:** Must align commit scopes with BMAD module structure (bmm, workflows, agents, automation)

### FR Coverage Map

FR1: Epic 1 - Enforce conventional commit message format
FR2: Epic 1 - Validate commit types and scopes
FR3: Epic 1 - Run ESLint before commits
FR4: Epic 1 - Run unit tests before commits
FR5: Epic 2 - Run full test suite before protected branch pushes
FR6: Epic 2 - Validate documentation synchronization
FR7: Epic 3 - Automatically determine version bumps
FR8: Epic 3 - Generate and update CHANGELOG.md
FR9: Epic 3 - Create git tags for releases
FR10: Epic 4 - Trigger PR validation on GitHub
FR11: Epic 4 - Run linting and tests in CI/CD
FR12: Epic 4 - Generate changelog preview in PR comments
FR13: Epic 5 - Auto-bump version on merge to main
FR14: Epic 5 - Regenerate docs using BMM workflow
FR15: Epic 5 - Create GitHub releases automatically
FR16: Epic 5 - Sync _bmad-output/docs/ to docs/
FR17: Epic 6 - Track automation events in BMM status
FR18: Epic 2 - Allow emergency bypass with --no-verify

## Epic List

### Epic 1: Local Development Quality Gates
Developers receive immediate feedback on code quality and commit message format before commits are created, ensuring only quality code enters the repository.

**FRs covered:** FR1, FR2, FR3, FR4
**NFRs addressed:** NFR1, NFR2, NFR4, NFR6

### Epic 2: Protected Branch Validation & Documentation Sync
Developers cannot push untested code or undocumented architecture changes to main/dev branches, with emergency bypass available for critical situations.

**FRs covered:** FR5, FR6, FR18
**NFRs addressed:** NFR1, NFR3, NFR7
**ARCHs addressed:** ARCH9

### Epic 3: Semantic Versioning & Changelog Automation
Developers never manually bump versions or write changelogs; the system automatically determines semantic versions from commit messages and generates release notes.

**FRs covered:** FR7, FR8, FR9
**NFRs addressed:** NFR8, NFR10

### Epic 4: Pull Request Validation & Preview
Developers see automated validation results and changelog previews in PR comments, ensuring code quality before merge.

**FRs covered:** FR10, FR11, FR12
**NFRs addressed:** NFR5, NFR6, NFR9

### Epic 5: Automated Release & Documentation Pipeline
Developers get fully automated releases when merging to main, including version bumps, documentation regeneration, GitHub releases, and tag creation—all with zero manual intervention.

**FRs covered:** FR13, FR14, FR15, FR16
**NFRs addressed:** NFR5, NFR9
**ARCHs addressed:** ARCH6, ARCH7

### Epic 6: BMAD Workflow Integration & Status Tracking
Developers have full BMAD framework integration with automation events tracked in workflow status files, enabling BMM workflows to see automation activity.

**FRs covered:** FR17
**ARCHs addressed:** ARCH6, ARCH7, ARCH8, ARCH10

---

## Epic 1: Local Development Quality Gates

Developers receive immediate feedback on code quality and commit message format before commits are created, ensuring only quality code enters the repository.

### Story 1.1: Install and Configure Husky Git Hook Manager

As a developer,
I want Husky installed and initialized in the project,
So that I can configure git hooks to run automatically on commit events.

**Acceptance Criteria:**

**Given** the project has a package.json file
**When** I install Husky as a dev dependency and run `npx husky init`
**Then** a `.husky/` directory is created in project root
**And** a `prepare` script is added to package.json that runs `husky install`
**And** Husky hooks are activated when git commands are executed
**And** the installation is documented in package.json devDependencies

### Story 1.2: Configure Commitlint for Conventional Commits

As a developer,
I want commit messages validated against conventional commit standards,
So that all commits follow a consistent, parseable format for automation.

**Acceptance Criteria:**

**Given** Husky is installed and configured
**When** I install @commitlint/cli and @commitlint/config-conventional
**Then** a `.commitlintrc.json` configuration file is created
**And** the config defines allowed types: feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert
**And** the config defines allowed scopes: core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation (FR2, ARCH10)
**And** commit message rules enforce lowercase subjects and 100 char max length
**And** a commit-msg hook is created at `.husky/commit-msg` that runs commitlint
**And** invalid commit messages are blocked with clear error messages (NFR1, NFR2)

### Story 1.3: Create Pre-commit Hook for Linting

As a developer,
I want ESLint to run automatically before commits,
So that code quality issues are caught immediately before they enter the repository.

**Acceptance Criteria:**

**Given** Husky and commitlint are configured
**When** I create a `.husky/pre-commit` hook script
**Then** the hook runs `npm run lint` before allowing commits
**And** commits are blocked if linting fails (NFR1)
**And** clear error messages show which files have linting issues (NFR2)
**And** the hook outputs "🔍 Running pre-commit checks..." for user feedback
**And** the hook exits with code 1 on lint failure
**And** the hook outputs "✅ Pre-commit checks passed!" on success

### Story 1.4: Add Unit Test Execution to Pre-commit Hook

As a developer,
I want unit tests to run automatically before commits,
So that broken tests are caught before code is committed.

**Acceptance Criteria:**

**Given** the pre-commit hook exists and runs linting
**When** I add unit test execution to the pre-commit hook
**Then** the hook runs `npm run test -- --testPathIgnorePatterns=integration` after linting
**And** commits are blocked if tests fail (NFR1)
**And** the hook outputs "🧪 Running unit tests..." for user feedback
**And** integration tests are skipped to keep pre-commit fast
**And** clear error messages show which tests failed (NFR2)
**And** all pre-commit validations (lint + tests) must pass before commit is created (FR3, FR4)

---

## Epic 2: Protected Branch Validation & Documentation Sync

Developers cannot push untested code or undocumented architecture changes to main/dev branches, with emergency bypass available for critical situations.

### Story 2.1: Create Pre-push Hook for Protected Branches

As a developer,
I want full test suite validation before pushing to main or dev branches,
So that only thoroughly tested code reaches protected branches.

**Acceptance Criteria:**

**Given** the project has protected branches (main and dev)
**When** I create a `.husky/pre-push` hook script
**Then** the hook detects the current branch using `git rev-parse --abbrev-ref HEAD`
**And** the hook checks if the branch is in the protected list (main, dev)
**And** if pushing to protected branch, the hook runs `npm run test:coverage` (FR5)
**And** the hook runs both `npm run lint` and `npm run lint:web`
**And** pushes are blocked if any validation fails (NFR1)
**And** the hook outputs "🛡️ Pushing to protected branch '$current_branch' - running validations..."
**And** the hook outputs "✅ All pre-push checks passed!" on success

### Story 2.2: Create Documentation Validation Script

As a developer,
I want to be notified when architecture files change without doc updates,
So that documentation stays synchronized with code changes.

**Acceptance Criteria:**

**Given** the project has critical architecture files
**When** I create `.husky/scripts/validate-docs.js` script
**Then** the script defines CRITICAL_FILES array including: src/core/, src/app/, prisma/schema.prisma, package.json, src/config/ (ARCH9)
**And** the script defines DOC_FILES array including: docs/architecture.md, docs/project-context.md, docs/technology-stack.md, docs/development-guide.md, README.md
**And** the script defines BMAD_DOC_FILES array including: _bmad-output/docs/, _bmad-output/analysis/ (ARCH7)
**And** the script runs `git diff --name-only origin/main...HEAD` to get changed files
**And** the script checks if critical files changed without corresponding doc updates (FR6, NFR3)
**And** the script outputs clear error messages listing which files changed and which docs need updating (NFR2)
**And** the script suggests running `npm run docs:generate` to fix the issue

### Story 2.3: Integrate Documentation Validation into Pre-push Hook

As a developer,
I want documentation validation to run automatically before pushing to protected branches,
So that I'm reminded to update docs when architecture changes.

**Acceptance Criteria:**

**Given** the documentation validation script exists
**And** the pre-push hook exists for protected branches
**When** I add documentation validation to the pre-push hook
**Then** the hook runs `node .husky/scripts/validate-docs.js` after test and lint checks
**And** the hook outputs "📚 Validating documentation synchronization..."
**And** pushes are blocked if docs are out of sync (NFR1)
**And** the error message clearly states which docs need updating (NFR2)

### Story 2.4: Add Emergency Bypass Capability

As a developer,
I want the ability to bypass git hooks in genuine emergencies,
So that critical hotfixes can be deployed quickly when necessary.

**Acceptance Criteria:**

**Given** git hooks are enforcing quality gates
**When** I use the `--no-verify` flag with git commit or git push
**Then** all git hooks are bypassed (FR18)
**And** the commit or push completes without running validations
**And** documentation clearly warns this should only be used in emergencies
**And** the bypass capability is documented in README or development guide

---

## Epic 3: Semantic Versioning & Changelog Automation

Developers never manually bump versions or write changelogs; the system automatically determines semantic versions from commit messages and generates release notes.

### Story 3.1: Install and Configure Standard-Version

As a developer,
I want standard-version installed and configured,
So that semantic versioning can be automated from conventional commits.

**Acceptance Criteria:**

**Given** the project uses conventional commits
**When** I install standard-version as a dev dependency
**Then** standard-version package is added to package.json devDependencies
**And** the installation is compatible with Node.js and existing project structure (NFR6)
**And** standard-version is ready to parse conventional commits

### Story 3.2: Create Version Configuration File

As a developer,
I want version bumping rules configured,
So that feat/fix/BREAKING CHANGE commits automatically determine version increments.

**Acceptance Criteria:**

**Given** standard-version is installed
**When** I create `.versionrc.json` configuration file
**Then** the config defines commit types and their changelog sections (feat=Features, fix=Bug Fixes, docs=Documentation, etc.)
**And** the config hides chore, style, test, build, ci commits from changelog
**And** the config includes commitUrlFormat, compareUrlFormat, and issueUrlFormat for GitHub
**And** the config specifies bumpFiles for package.json and package-lock.json (FR7)
**And** the config does not skip tag creation
**And** version bumping is deterministic: feat=minor, fix=patch, BREAKING CHANGE=major (NFR8)

### Story 3.3: Add NPM Scripts for Version Management

As a developer,
I want convenient npm scripts for version management,
So that releases can be triggered easily with proper versioning.

**Acceptance Criteria:**

**Given** standard-version is configured
**When** I add version management scripts to package.json
**Then** a `release` script runs `standard-version` (automatic version bump)
**And** a `release:minor` script runs `standard-version --release-as minor`
**And** a `release:major` script runs `standard-version --release-as major`
**And** a `release:patch` script runs `standard-version --release-as patch`
**And** a `release:dry-run` script runs `standard-version --dry-run` for preview
**And** a `postrelease` script runs `git push --follow-tags origin main`
**And** all scripts are documented and version-controlled (NFR10)

### Story 3.4: Generate Initial CHANGELOG.md

As a developer,
I want an initial CHANGELOG.md created with current version,
So that all future releases are documented from this baseline.

**Acceptance Criteria:**

**Given** standard-version is configured
**When** I run `npx standard-version --first-release`
**Then** a CHANGELOG.md file is created in project root
**And** the changelog includes current version (2.0.0) as baseline
**And** the version is not bumped (--first-release flag)
**And** the CHANGELOG.md follows standard-version format
**And** future releases will append to this changelog (FR8, FR9)
**And** the CHANGELOG.md is committed to version control

---

## Epic 4: Pull Request Validation & Preview

Developers see automated validation results and changelog previews in PR comments, ensuring code quality before merge.

### Story 4.1: Create GitHub Actions Directory and PR Workflow File

As a developer,
I want a GitHub Actions workflow that triggers on PR events,
So that automated validation runs when PRs are opened or updated.

**Acceptance Criteria:**

**Given** the project uses GitHub for version control
**When** I create `.github/workflows/pr-validation.yml` file
**Then** the workflow triggers on pull_request events for branches [main, dev]
**And** the workflow triggers on types: opened, synchronize, reopened (FR10)
**And** the workflow runs on ubuntu-latest runner
**And** the workflow uses full git history (fetch-depth: 0) for commit analysis
**And** the workflow is named "PR Validation" for clear identification

### Story 4.2: Add Dependency Installation and Linting Steps

As a developer,
I want PR workflows to install dependencies and run linting,
So that code quality is validated in CI before merge.

**Acceptance Criteria:**

**Given** the PR validation workflow file exists
**When** I add dependency and linting steps
**Then** the workflow checks out code using actions/checkout@v4
**And** the workflow sets up Node.js 20 using actions/setup-node@v4
**And** the workflow uses npm cache for faster builds
**And** the workflow runs `npm ci` to install dependencies
**And** the workflow runs `npm run lint` and `npm run lint:web` (FR11)
**And** linting failures fail the workflow (continue-on-error: false)
**And** the workflow minimizes costs by caching dependencies (NFR5)

### Story 4.3: Add Test Execution with Coverage Reporting

As a developer,
I want PR workflows to run full test suite with coverage,
So that test failures are caught before merge.

**Acceptance Criteria:**

**Given** the PR workflow has dependency installation
**When** I add test execution steps
**Then** the workflow runs `npm run test:coverage` (FR11)
**And** test failures fail the workflow
**And** the workflow uploads coverage to codecov using codecov-action@v3
**And** coverage files from ./coverage/lcov.info are uploaded
**And** coverage upload failures don't fail the workflow (continue-on-error: true)
**And** the workflow provides test result visibility in PR checks

### Story 4.4: Add Commit Message Validation Step

As a developer,
I want PR workflows to validate all commit messages,
So that non-conventional commits are caught before merge.

**Acceptance Criteria:**

**Given** the PR workflow runs tests and linting
**When** I add commit message validation step
**Then** the workflow runs `npx commitlint --from base.sha --to HEAD --verbose`
**And** the workflow validates all commits in the PR against conventional commit rules
**And** invalid commit messages fail the workflow
**And** the failure message clearly indicates which commits are invalid (NFR2)

### Story 4.5: Add Changelog Preview Generation

As a developer,
I want to see a changelog preview in PR comments,
So that I know what release notes will be generated.

**Acceptance Criteria:**

**Given** the PR workflow validates commits
**When** I add changelog preview generation step
**Then** the workflow runs `standard-version --dry-run --skip.commit --skip.tag`
**And** the output is captured to changelog-preview.md file
**And** the workflow extracts changelog content from dry-run output (FR12)
**And** if no conventional commits found, shows "No conventional commits found for changelog"
**And** the changelog preview is formatted with markdown heading "## 📋 Changelog Preview"

### Story 4.6: Add PR Comment with Validation Results

As a developer,
I want validation results posted as PR comments,
So that I can see all check results without navigating to workflow runs.

**Acceptance Criteria:**

**Given** the workflow has completed all validation steps
**When** I add PR comment step using actions/github-script@v7
**Then** the step runs always (if: always()) to comment even on failures
**And** the comment includes changelog preview content
**And** the comment lists completed checks: Linting, Test Suite, Commit Message Format, Documentation Sync
**And** the comment includes link to full workflow run
**And** the comment is formatted as "## 🤖 PR Validation Results"
**And** the script creates comment using github.rest.issues.createComment API

---

## Epic 5: Automated Release & Documentation Pipeline

Developers get fully automated releases when merging to main, including version bumps, documentation regeneration, GitHub releases, and tag creation—all with zero manual intervention.

### Story 5.1: Create GitHub Actions Release Workflow File

As a developer,
I want a GitHub Actions workflow that triggers on main branch pushes,
So that releases are automated when PRs merge to main.

**Acceptance Criteria:**

**Given** the project uses GitHub and has main branch
**When** I create `.github/workflows/release.yml` file
**Then** the workflow triggers on push to main branch
**And** the workflow runs on ubuntu-latest runner
**And** the workflow has permissions for contents: write and pull-requests: write
**And** the workflow uses full git history (fetch-depth: 0)
**And** the workflow configures git user as "github-actions[bot]"
**And** the workflow is named "Release & Documentation"

### Story 5.2: Add Version Bump and Changelog Generation Steps

As a developer,
I want versions automatically bumped and changelogs updated on main merge,
So that releases are semantically versioned without manual intervention.

**Acceptance Criteria:**

**Given** the release workflow is configured
**When** I add version bump steps after dependency installation
**Then** the workflow runs tests first to validate the merge
**And** the workflow runs `npx standard-version --skip.commit --skip.tag`
**And** the workflow extracts new version from package.json (FR13)
**And** the workflow stores new version in GITHUB_OUTPUT for later steps
**And** CHANGELOG.md is updated with new release notes (FR8)
**And** package.json and package-lock.json versions are bumped
**And** version determination is automatic based on conventional commits (NFR8)

### Story 5.3: Add Documentation Regeneration Step

As a developer,
I want documentation automatically regenerated on release,
So that docs stay synchronized with code without manual updates.

**Acceptance Criteria:**

**Given** version has been bumped in the release workflow
**When** I add documentation regeneration step
**Then** the workflow runs `npm run docs:generate` (FR14)
**And** the script attempts to run BMM document-project workflow via Claude CLI (ARCH6)
**And** if Claude CLI is not available, the step outputs a warning but doesn't fail
**And** the step uses continue-on-error: true for graceful degradation (NFR9)
**And** _bmad-output/docs/ is synchronized to docs/ directory if docs were generated (FR16, ARCH7)

### Story 5.4: Commit Version Bump and Push Changes

As a developer,
I want version changes committed and pushed back to main automatically,
So that the repository reflects the new release version.

**Acceptance Criteria:**

**Given** version has been bumped and docs regenerated
**When** I add commit and push steps
**Then** the workflow runs `git add .` to stage all changes
**And** the workflow commits with message "chore(release): v{version} [skip ci]"
**And** the [skip ci] tag prevents infinite workflow loops
**And** if no changes exist, the commit step doesn't fail (echo "No changes to commit")
**And** the workflow creates annotated git tag with `git tag -a v{version} -m "Release v{version}"` (FR9)
**And** the workflow pushes changes and tags with `git push origin main --follow-tags`

### Story 5.5: Create GitHub Release with Changelog

As a developer,
I want GitHub releases created automatically with changelog content,
So that releases are documented and visible in GitHub UI.

**Acceptance Criteria:**

**Given** version has been bumped, committed, and tagged
**When** I add GitHub release creation step using actions/github-script@v7
**Then** the workflow reads CHANGELOG.md content
**And** the workflow extracts latest version section from changelog
**And** the workflow creates release using github.rest.repos.createRelease API (FR15)
**And** the release uses tag name `v{version}`
**And** the release name is `Release v{version}`
**And** the release body contains changelog content for this version
**And** the release is not marked as draft or prerelease
**And** the release is visible in GitHub releases UI

---

## Epic 6: BMAD Workflow Integration & Status Tracking

Developers have full BMAD framework integration with automation events tracked in workflow status files, enabling BMM workflows to see automation activity.

### Story 6.1: Install js-yaml and Create Workflow Status Update Script

As a developer,
I want automation events logged to BMM workflow status files,
So that BMM workflows can track automation activity.

**Acceptance Criteria:**

**Given** the project uses BMAD framework with workflow status tracking
**When** I install js-yaml as dev dependency
**Then** js-yaml is added to package.json devDependencies
**And** I create `.husky/scripts/update-workflow-status.js` script
**And** the script imports js-yaml for YAML parsing
**And** the script defines WORKFLOW_STATUS_FILE constant as '_bmad-output/bmm-workflow-status.yaml' (ARCH8)
**And** the script checks if status file exists before attempting updates
**And** the script gracefully handles missing status file (logs info message, no error)
**And** the script is executable with Node.js

### Story 6.2: Implement Status Update Logic

As a developer,
I want the status script to append automation events to the status file,
So that all automation activity is tracked chronologically.

**Acceptance Criteria:**

**Given** the workflow status update script exists
**When** I implement the updateWorkflowStatus function
**Then** the function reads existing bmm-workflow-status.yaml content
**And** the function parses YAML using js-yaml
**And** the function creates automation_events array if it doesn't exist
**And** the function appends new event with timestamp, event type, and metadata
**And** the function writes updated YAML back to status file (FR17)
**And** the function outputs "✅ Updated BMM workflow status: {event}" on success
**And** the function gracefully handles errors with warning messages (NFR9)
**And** the script accepts event type and metadata from command line arguments

### Story 6.3: Create Post-commit Hook for Commit Tracking

As a developer,
I want commit events tracked in workflow status,
So that BMM workflows can see commit activity.

**Acceptance Criteria:**

**Given** the workflow status update script exists
**When** I create `.husky/post-commit` hook
**Then** the hook runs after successful commits
**And** the hook extracts commit message using `git log -1 --pretty=%B`
**And** the hook calls workflow status script with event "commit_made" and commit message metadata
**And** the hook uses `|| true` to prevent commit failures if status update fails
**And** commit events are logged to bmm-workflow-status.yaml with timestamps

### Story 6.4: Update Pre-push Hook for Push Tracking

As a developer,
I want successful push validations tracked in workflow status,
So that BMM workflows can see when code was pushed to protected branches.

**Acceptance Criteria:**

**Given** the pre-push hook exists and validates protected branches
**When** I add status tracking to the pre-push hook
**Then** the hook calls workflow status script after all validations pass
**And** the hook logs event "pre_push_validated" with branch name metadata
**And** the hook uses `|| true` to prevent push failures if status update fails
**And** push events are logged to bmm-workflow-status.yaml

### Story 6.5: Update GitHub Release Workflow for Release Tracking

As a developer,
I want release events tracked in workflow status,
So that BMM workflows can see when releases are published.

**Acceptance Criteria:**

**Given** the GitHub Actions release workflow exists
**When** I add status tracking step after "Create GitHub Release"
**Then** the step runs `node .husky/scripts/update-workflow-status.js "release_published" "{version: {new_version}}"`
**And** the step uses continue-on-error: true for graceful degradation
**And** if status update fails, the step outputs "Status update skipped" but workflow succeeds
**And** release events are logged to bmm-workflow-status.yaml when Claude CLI is available
**And** the step respects BMAD output folder structure (ARCH7)

### Story 6.6: Add .gitignore Entries for BMAD Automation

As a developer,
I want BMAD automation artifacts properly ignored,
So that temporary files don't clutter version control while preserving structured output.

**Acceptance Criteria:**

**Given** the project generates automation artifacts
**When** I update `.gitignore` file
**Then** the gitignore includes coverage/ directory
**And** the gitignore includes *.lcov files
**And** the gitignore includes _bmad-output/.temp/ directory (ARCH7)
**And** the gitignore includes _bmad-output/**/*.tmp files
**And** structured BMAD output (_bmad-output/docs/, _bmad-output/epics.md, etc.) is NOT ignored
**And** the gitignore is documented and version-controlled (NFR10)

---

## Epic 7: Image Processing Improvements

Image downloads are processed with WordPress-compatible filenames, metadata embedding, and format conversion to ensure all images can be uploaded without errors.

### Story 7.1: Image Naming Convention Fix & Enhancement

As a content automation operator,
I want image filenames to use clean article slugs instead of full URL paths,
So that WordPress media gallery uploads work correctly and filenames are human-readable.

**Acceptance Criteria:**

**Given** a scraped article URL like `www.zimbricknissan.com_blog_2025_december_30_your-guide-to-the-best-2026-nissan-suvs-for-madison-wi.htm.html`
**When** images are downloaded
**Then** filenames should be `{clean-slug}_{original-name}.{ext}` without `.htm`
**And** the mapping should include `articleSlug`, `localFilename`, `originalUrl`, `sourceFile`, `size`, and `alt` fields
**And** processed content should use the new clean filenames from the mapping
**And** IPTC metadata should be embedded when exiftool is installed and alt text exists

### Story 7.2: AVIF/AV1 Image Format Auto-Conversion for WordPress

As a content automation operator,
I want all downloaded AVIF/AV1 images automatically converted to JPEG format,
So that images can be uploaded to WordPress which doesn't support AVIF format.

**Acceptance Criteria:**

**Given** an image download completes with `.avif` extension
**When** the download process finishes
**Then** the image should be automatically converted to JPEG format (`.jpg`)
**And** the configuration option `autoConvertAvif` should control this behavior (default: true)
**And** the original `.avif` file should be deleted after successful conversion
**And** the mapping should reflect the `.jpg` extension and include `formatConverted` metadata
**And** if ImageMagick is not installed, the system should warn and keep the original file
