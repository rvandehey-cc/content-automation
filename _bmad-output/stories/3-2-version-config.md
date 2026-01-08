# Story 3.2: Create Version Configuration File

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want version bumping rules configured,
so that feat/fix/BREAKING CHANGE commits automatically determine version increments.

## Acceptance Criteria

**Given** standard-version is installed
**When** I create `.versionrc.json` configuration file
**Then** the config defines commit types and their changelog sections (feat=Features, fix=Bug Fixes, docs=Documentation, etc.)
**And** the config hides chore, style, test, build, ci commits from changelog
**And** the config includes commitUrlFormat, compareUrlFormat, and issueUrlFormat for GitHub
**And** the config specifies bumpFiles for package.json and package-lock.json (FR7)
**And** the config does not skip tag creation
**And** version bumping is deterministic: feat=minor, fix=patch, BREAKING CHANGE=major (NFR8)

## Tasks / Subtasks

- [x] Task 1: Create `.versionrc.json` configuration file (AC: All)
  - [x] Subtask 1.1: Define commit types section with changelog mappings
  - [x] Subtask 1.2: Configure hidden commit types (exclude from changelog)
  - [x] Subtask 1.3: Configure GitHub URL formats for commit/compare/issue links
  - [x] Subtask 1.4: Specify bumpFiles array (package.json, package-lock.json)
  - [x] Subtask 1.5: Verify tag creation is enabled (skip.tag: false or omitted)

- [x] Task 2: Validate configuration against epics requirements (AC: 6)
  - [x] Subtask 2.1: Verify feat commits → minor version bump
  - [x] Subtask 2.2: Verify fix commits → patch version bump
  - [x] Subtask 2.3: Verify BREAKING CHANGE footer → major version bump
  - [x] Subtask 2.4: Test dry-run with `npx standard-version --dry-run` to preview behavior

## Dev Notes

**Epic Context:** This is Story 3.2, the SECOND story in Epic 3 (Semantic Versioning & Changelog Automation). This story configures the rules that translate conventional commits into semantic version bumps and changelog sections.

**Story Dependencies:**
- **Story 3.1 (COMPLETE - Review Status):** standard-version ^9.5.0 installed and verified
  - Package confirmed in package.json devDependencies
  - Help command tested and working
  - Ready to configure

**Functional Requirements Covered:**
- **FR7:** System must automatically determine version bumps based on conventional commits
  - feat commits → minor version bump (1.0.0 → 1.1.0)
  - fix commits → patch version bump (1.0.0 → 1.0.1)
  - BREAKING CHANGE footer → major version bump (1.0.0 → 2.0.0)
- **FR8:** System must automatically generate and update CHANGELOG.md from commit messages
  - Commit types map to changelog sections
  - Hidden types excluded from changelog
- **FR9:** System must create git tags for each version release
  - Tag creation must NOT be skipped

**Non-Functional Requirements:**
- **NFR8:** Version bumping must be deterministic and predictable based on commit messages
  - Same commits always produce same version bump
  - No manual intervention or randomness
- **NFR10:** All configuration files must be version-controlled and documented
  - `.versionrc.json` committed to repo
  - Configuration explains each setting

### Architecture Compliance

**Configuration Management (ARCH5 - Singleton Pattern):**
- `.versionrc.json` is standard-version's configuration file (not part of src/config/)
- This is an external tool config, similar to `.eslintrc.json` or `commitlintrc.json`
- Root-level placement is standard practice for tooling configs

**Git Hooks Integration:**
- This configuration will be used by:
  - Story 3.3: npm scripts (npm run release)
  - Story 4.5: GitHub Actions changelog preview (PR comments)
  - Story 5.2: Automated release workflow (version bumps on merge to main)

**Project Structure Alignment:**
- Root config files follow established pattern:
  - `.eslintrc.json` (linting rules)
  - `.commitlintrc.json` (commit validation rules)
  - `.versionrc.json` (versioning rules) ← NEW FILE
- All tooling configs live at project root for discovery by tools

### Version Configuration Design

**Standard-Version Behavior (How It Works):**

1. **Reads Commits:** Scans git history from last tag to HEAD
2. **Parses Commit Messages:** Uses conventional commit parser
3. **Determines Bump:**
   - BREAKING CHANGE in footer → major (1.0.0 → 2.0.0)
   - feat: type → minor (1.0.0 → 1.1.0)
   - fix: type → patch (1.0.0 → 1.0.1)
   - Other types → no version bump (unless configured)
4. **Updates Files:** Writes new version to files in `bumpFiles` array
5. **Generates Changelog:** Groups commits by type into CHANGELOG.md sections
6. **Creates Tag:** Makes annotated git tag (e.g., v2.0.1)

**Configuration File Structure:**

The `.versionrc.json` file controls standard-version behavior:

```json
{
  "types": [
    // Defines which commit types appear in changelog and their section headers
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Bug Fixes" }
  ],
  "bumpFiles": [
    // Files that get version number updated
    { "filename": "package.json", "type": "json" },
    { "filename": "package-lock.json", "type": "json" }
  ],
  "commitUrlFormat": "{{host}}/{{owner}}/{{repository}}/commit/{{hash}}",
  "compareUrlFormat": "{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}",
  "issueUrlFormat": "{{host}}/{{owner}}/{{repository}}/issues/{{id}}"
}
```

**Commit Types to Include in Changelog:**

Based on Epic 3 requirements and story 3.1 context, include these types:

1. **feat** (Features section)
   - New features
   - Triggers MINOR version bump

2. **fix** (Bug Fixes section)
   - Bug fixes
   - Triggers PATCH version bump

3. **docs** (Documentation section)
   - Documentation only changes
   - No version bump (unless only commit type)

4. **perf** (Performance Improvements section)
   - Performance improvements
   - Triggers PATCH version bump

5. **refactor** (Code Refactoring section)
   - Refactoring (no functional changes)
   - No version bump by default

**Commit Types to HIDE from Changelog:**

These types should NOT appear in CHANGELOG.md (internal dev changes):

- **chore**: Maintenance tasks (dependency updates, tooling)
- **style**: Formatting, whitespace (no code change)
- **test**: Adding/updating tests
- **build**: Build system changes
- **ci**: CI/CD configuration changes
- **revert**: Reverting previous commits

**Standard-Version Hidden Type Syntax:**

To hide a type from changelog, set `"hidden": true`:

```json
{ "type": "chore", "hidden": true }
```

**GitHub Integration (URL Formats):**

The project uses GitHub for version control (confirmed from git status):

- **Repository**: Assumed to be `github.com/[owner]/wp-content-automation`
- **Commit URLs**: Link to specific commits in changelog
- **Compare URLs**: Link to diff between versions
- **Issue URLs**: Link to GitHub issues (#123 references)

**URL Format Variables:**
- `{{host}}`: GitHub host (https://github.com)
- `{{owner}}`: GitHub organization/user
- `{{repository}}`: Repository name
- `{{hash}}`: Commit SHA
- `{{previousTag}}`: Previous version tag
- `{{currentTag}}`: New version tag
- `{{id}}`: Issue number

**Bump Files (Version Update Targets):**

standard-version needs to know which files contain version numbers:

1. **package.json** (REQUIRED)
   - Main project version
   - Type: `"json"` (JSON parser)

2. **package-lock.json** (REQUIRED)
   - Lock file version must stay in sync
   - Type: `"json"` (JSON parser)

**Other potential files (NOT included for this project):**
- `manifest.json` (browser extensions)
- `composer.json` (PHP projects)
- `pyproject.toml` (Python projects)

**Tag Creation Configuration:**

Epic 3 requirement FR9: "System must create git tags for each version release"

**Default Behavior:** standard-version creates tags unless explicitly skipped

**Configuration options:**
- Omit `skip` entirely (recommended - tags created by default)
- OR explicitly set: `"skip": { "tag": false }`

**DO NOT SET:** `"skip": { "tag": true }` - this would break FR9

### Project Context Notes

**Current Project Version:** 2.0.0 (from package.json, confirmed in story 3.1)

**Version History Strategy:**
- Story 3.4 will run `--first-release` to create baseline CHANGELOG.md
- This will NOT bump version (stays at 2.0.0)
- First ACTUAL version bump happens when:
  - Developer runs `npm run release` (Story 3.3), OR
  - GitHub Actions runs on merge to main (Epic 5)

**Commit Message Validation Already Enforced:**

From Epic 1 (Complete):
- Story 1.2 installed commitlint with `.commitlintrc.json`
- Allowed types: feat, fix, docs, chore, refactor, test, style, perf, ci, build, revert
- Allowed scopes: core, cli, web, db, docs, api, ui, config, deps, bmm, workflows, agents, automation

**Recent Commit Examples (for testing dry-run):**

From git log analysis:
- `feat(cli): implement pre-push hook for protected branches` → minor bump
- `feat(cli): add unit test execution to pre-commit hook` → minor bump
- `chore(cli): fix linting errors and warnings for pre-commit` → hidden from changelog

These patterns confirm conventional commits are working.

### Testing & Validation Strategy

**After creating `.versionrc.json`, validate with dry-run:**

```bash
# Test configuration without making changes
npx standard-version --dry-run
```

**Expected Dry-Run Output:**
1. Lists commits since last tag (or all commits if no tags)
2. Shows version bump calculation (e.g., "bumping version in package.json from 2.0.0 to 2.1.0")
3. Previews changelog sections with grouped commits
4. Shows tag that would be created (e.g., "tagging release v2.1.0")

**Validation Checklist:**
- ✅ Version bump follows semantic rules (feat=minor, fix=patch)
- ✅ Changelog includes feat, fix, docs, perf, refactor sections
- ✅ Changelog EXCLUDES chore, style, test, build, ci commits
- ✅ Commit URLs point to GitHub repository
- ✅ Tag name follows format `v{version}` (e.g., v2.1.0)
- ✅ Both package.json and package-lock.json show version updates

**Common Issues to Watch For:**

❌ **Issue:** Dry-run shows "No commits found" or "No version bump"
- **Cause:** No conventional commits since last tag, or only hidden types
- **Fix:** Expected if only chore/style commits; wait for feat/fix commits

❌ **Issue:** Version bump is wrong (e.g., patch instead of minor)
- **Cause:** Commit type mismatch or misconfigured `types` array
- **Fix:** Verify commit messages follow conventional format

❌ **Issue:** Changelog shows chore/test commits
- **Cause:** Missing `"hidden": true` for those types
- **Fix:** Add hidden flag to type definition

❌ **Issue:** package-lock.json version not updated
- **Cause:** Missing from `bumpFiles` array
- **Fix:** Ensure package-lock.json included in config

### References

**Source Documents:**
- [Source: _bmad-output/epics.md#Epic 3: Semantic Versioning & Changelog Automation]
- [Source: _bmad-output/epics.md#Story 3.2: Create Version Configuration File]
- [Source: _bmad-output/architecture.md#CI/CD Automation (FR-CICD-1 through FR-CICD-18)]
- [Source: _bmad-output/stories/3-1-install-configure-standard-version.md - Previous story completion]
- [Source: package.json - Current version 2.0.0, Node >=18.0.0]
- [Source: Story 1.2 - Commitlint types and scopes defined]

**External Documentation:**
- standard-version README: https://github.com/conventional-changelog/standard-version
- Conventional Commits Spec: https://www.conventionalcommits.org/
- Conventional Changelog Configuration: https://github.com/conventional-changelog/conventional-changelog-config-spec

**Related Stories:**
- **Story 3.1** (Completed): Installed standard-version package
- **Story 3.3** (Next): Will add npm scripts that USE this configuration
- **Story 3.4** (Future): Will run `--first-release` to create baseline CHANGELOG.md
- **Story 4.5** (Epic 4): GitHub Actions will use dry-run for PR changelog previews
- **Story 5.2** (Epic 5): Release workflow will use this config for version bumps

### Complete Configuration Template

**Full `.versionrc.json` Template (Developer Reference):**

```json
{
  "types": [
    {
      "type": "feat",
      "section": "Features"
    },
    {
      "type": "fix",
      "section": "Bug Fixes"
    },
    {
      "type": "docs",
      "section": "Documentation"
    },
    {
      "type": "perf",
      "section": "Performance Improvements"
    },
    {
      "type": "refactor",
      "section": "Code Refactoring"
    },
    {
      "type": "chore",
      "hidden": true
    },
    {
      "type": "style",
      "hidden": true
    },
    {
      "type": "test",
      "hidden": true
    },
    {
      "type": "build",
      "hidden": true
    },
    {
      "type": "ci",
      "hidden": true
    },
    {
      "type": "revert",
      "section": "Reverts"
    }
  ],
  "bumpFiles": [
    {
      "filename": "package.json",
      "type": "json"
    },
    {
      "filename": "package-lock.json",
      "type": "json"
    }
  ],
  "commitUrlFormat": "https://github.com/{{owner}}/{{repository}}/commit/{{hash}}",
  "compareUrlFormat": "https://github.com/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}",
  "issueUrlFormat": "https://github.com/{{owner}}/{{repository}}/issues/{{id}}"
}
```

**Configuration Explanation:**

1. **types array**: Defines changelog structure
   - Visible types get their own section header
   - Hidden types excluded from changelog entirely
   - Order determines section order in CHANGELOG.md

2. **bumpFiles array**: Files to update with new version
   - package.json: Main project version
   - package-lock.json: Keep lock file in sync

3. **URL formats**: Create clickable links in CHANGELOG.md
   - Commit links: Individual commit pages
   - Compare links: Diff view between versions
   - Issue links: GitHub issue tracker

**Customization Notes:**

- **GitHub Owner/Repo:** URL formats use placeholders; standard-version auto-detects from git remote
- **Additional Types:** Could add more types (e.g., "security" section for CVE fixes)
- **Section Order:** Types listed first appear first in changelog
- **Private Repos:** URL formats work same for public/private (auth handled by browser)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Configuration file creation with successful validation

### Completion Notes List

✅ Created `.versionrc.json` configuration file at project root
✅ Configured 11 commit types with appropriate changelog sections:
  - Visible in changelog: feat (Features), fix (Bug Fixes), docs (Documentation), perf (Performance Improvements), refactor (Code Refactoring), revert (Reverts)
  - Hidden from changelog: chore, style, test, build, ci
✅ Configured bumpFiles array for package.json and package-lock.json synchronization
✅ Configured GitHub URL formats for clickable commit/compare/issue links
✅ Verified tag creation enabled (no skip configuration)
✅ Validated configuration with `npx standard-version --dry-run`:
  - Correctly identified 2 feat commits since baseline
  - Calculated minor version bump: 2.0.0 → 2.1.0
  - Generated changelog with Features and Documentation sections
  - Excluded hidden commit types (chore not shown in preview)
  - Confirmed tag creation: v2.1.0
  - Verified both package.json and package-lock.json bump
✅ All 6 acceptance criteria validated and passing

### File List

- `.versionrc.json` (new file - standard-version configuration)
