# Story 5.1: Create GitHub Actions Release Workflow File

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a GitHub Actions workflow that triggers on main branch pushes,
so that releases are automated when PRs merge to main.

## Acceptance Criteria

**Given** the project uses GitHub and has a main branch
**When** I create `.github/workflows/release.yml` file
**Then** the workflow triggers on push to the `main` branch
**And** the workflow runs on an `ubuntu-latest` runner
**And** the workflow has permissions for `contents: write` and `pull-requests: write`
**And** the workflow uses full git history (`fetch-depth: 0`)
**And** the workflow configures the git user as "github-actions[bot]"
**And** the workflow is named "Release & Documentation" for clear identification

## Tasks / Subtasks

- [x] Task 1: Create the release workflow file (AC: 1-2, 7)
  - [x] Subtask 1.1: Create `.github/workflows/release.yml`
  - [x] Subtask 1.2: Set the workflow name to "Release & Documentation"
  - [x] Subtask 1.3: Configure the `push` trigger for the `main` branch

- [x] Task 2: Configure workflow environments and permissions (AC: 3-4, 6)
  - [x] Subtask 2.1: Specify `ubuntu-latest` as the runner
  - [x] Subtask 2.2: Add `permissions` block with `contents: write` and `pull-requests: write`
  - [x] Subtask 2.3: Configure the global `git` user as `github-actions[bot]`

- [x] Task 3: Initialize workflow jobs and steps (AC: 5)
  - [x] Subtask 3.1: Add a `release` job
  - [x] Subtask 3.2: Add a checkout step with `fetch-depth: 0`
  - [x] Subtask 3.3: Add Node.js setup and dependency installation steps (matching PR workflow)

## Dev Notes

**Epic Context:** This is Story 5.1, the FOUNDATIONAL story for Epic 5 (Automated Release & Documentation Pipeline). This epic automates the entire release process, from version bumping to documentation regeneration.

**Story Dependencies:**
- **Story 4.1 (COMPLETE):** PR workflow established the CI runner and environment patterns.
- **Epic 3 (COMPLETE):** Semantic versioning and changelog automation (standard-version) are configured and ready for CI integration.

**Functional Requirements Covered:**
- **FR13:** System must automatically bump version on merge to main branch (Foundational trigger)
- **FR9:** System must create git tags for each version release (Foundational permissions)

**Non-Functional Requirements:**
- **NFR5:** CI/CD workflows must minimize costs by running only when needed.
- **NFR6:** All automation must work with existing Node.js/npm project structure.

### Architecture Compliance

**Workflow File:**
- Location: `.github/workflows/release.yml`
- Branch: `main` only.
- Permissions: Elevated permissions are required for creating tags and updating `CHANGELOG.md` in the repository.

**Git Configuration:**
- Automation should use the official GitHub Actions bot identity:
  - Name: `github-actions[bot]`
  - Email: `41898282+github-actions[bot]@users.noreply.github.com`

### Technical Design

**Proposed Workflow Skeleton:**

```yaml
name: Release & Documentation

on:
  push:
    branches:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Configure Git
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"
```

### References

- [Source: _bmad-output/epics.md#Epic 5: Automated Release & Documentation Pipeline]
- [Source: _bmad-output/architecture.md#Infrastructure & Deployment]
- [Source: .github/workflows/pr-validation.yml - Reference for environment setup]

## Dev Agent Record

**Review Summary**
- Story: 5.1
- Git vs Story discrepancies: 0
- Issues: 0/0/0
- Verification status: verified

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

N/A - Implementation completed without issues

### Completion Notes List

✅ **Story 5.1 Complete - Release Workflow Foundation Established**

**Implementation Summary:**
- Created `.github/workflows/release.yml` following GitHub Actions best practices
- Workflow triggers automatically on push to `main` branch
- Configured elevated permissions (`contents: write`, `pull-requests: write`) for tag/release creation
- Set up complete CI environment: ubuntu-latest, Node.js 20, npm ci
- Configured git user as official GitHub Actions bot identity
- Full git history enabled (`fetch-depth: 0`) for semantic versioning

**TDD Approach:**
- Wrote 12 comprehensive tests covering all acceptance criteria
- All tests passed on first implementation (RED → GREEN)
- Full test suite: 131/131 tests passing (no regressions)

**Architecture Compliance:**
- Followed existing PR workflow patterns (.github/workflows/pr-validation.yml)
- Matches Node.js/npm setup from Story 4.1
- Prepared for Stories 5.2-5.5 to extend with version bumping, changelog, docs, and releases

**Technical Decisions:**
- Used `actions/checkout@v4` and `actions/setup-node@v4` for latest stable actions
- Git bot email: `41898282+github-actions[bot]@users.noreply.github.com` (official GitHub identity)
- Kept workflow minimal per story scope - subsequent stories will add release steps

### File List
- `.github/workflows/release.yml` (new)
- `tests/infrastructure/github-actions.test.js` (modified - added Story 5.1 test suite)

## Change Log

**2026-01-07** - Story 5.1 Implementation Complete
- Created GitHub Actions release workflow file
- Configured workflow to trigger on main branch pushes
- Set up permissions for contents and pull-requests
- Configured CI environment with Node.js 20 and npm
- Set git user identity to github-actions bot
- Added comprehensive test suite (12 tests)
- All acceptance criteria met and validated
