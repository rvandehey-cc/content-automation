# Story 3.3: Add NPM Scripts for Version Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want convenient npm scripts for version management,
so that releases can be triggered easily with proper versioning.

## Acceptance Criteria

**Given** standard-version is configured
**When** I add version management scripts to package.json
**Then** a `release` script runs `standard-version` (automatic version bump)
**And** a `release:minor` script runs `standard-version --release-as minor`
**And** a `release:major` script runs `standard-version --release-as major`
**And** a `release:patch` script runs `standard-version --release-as patch`
**And** a `release:dry-run` script runs `standard-version --dry-run` for preview
**And** a `postrelease` script runs `git push --follow-tags origin main`
**And** all scripts are documented and version-controlled (NFR10)

## Tasks / Subtasks

- [x] Task 1: Add version management scripts to package.json (AC: All)
  - [x] Subtask 1.1: Add `release` script for automatic semantic version bump
  - [x] Subtask 1.2: Add `release:minor` script for explicit minor version bump
  - [x] Subtask 1.3: Add `release:major` script for explicit major version bump
  - [x] Subtask 1.4: Add `release:patch` script for explicit patch version bump
  - [x] Subtask 1.5: Add `release:dry-run` script for previewing version bump without changes
  - [x] Subtask 1.6: Add `postrelease` script to automatically push tags and commits

- [x] Task 2: Validate scripts work correctly (AC: All)
  - [x] Subtask 2.1: Test `npm run release:dry-run` to preview version bump
  - [x] Subtask 2.2: Verify dry-run shows correct version increment based on commits
  - [x] Subtask 2.3: Verify dry-run shows changelog preview
  - [x] Subtask 2.4: Confirm scripts are documented in package.json

## Dev Notes

**Epic Context:** This is Story 3.3, the THIRD story in Epic 3 (Semantic Versioning & Changelog Automation). This story adds convenient npm scripts that developers use to trigger releases and version bumps.

**Story Dependencies:**
- **Story 3.1 (COMPLETE):** standard-version ^9.5.0 installed and verified
- **Story 3.2 (READY):** `.versionrc.json` configuration file created with version bump rules
  - Configuration defines commit types and changelog sections
  - Specifies bumpFiles (package.json, package-lock.json)
  - GitHub URL formats configured
  - Tag creation enabled

**Functional Requirements Covered:**
- **FR7:** System must automatically determine version bumps based on conventional commits
  - The `release` script uses standard-version to analyze commits and bump version
  - feat commits → minor bump (2.0.0 → 2.1.0)
  - fix commits → patch bump (2.0.0 → 2.0.1)
  - BREAKING CHANGE → major bump (2.0.0 → 3.0.0)
- **FR8:** System must automatically generate and update CHANGELOG.md
  - All release scripts automatically update CHANGELOG.md
  - Commits grouped by type into sections
- **FR9:** System must create git tags for each version release
  - standard-version creates annotated tags (e.g., v2.1.0)
  - `postrelease` script pushes tags with `--follow-tags`

**Non-Functional Requirements:**
- **NFR8:** Version bumping must be deterministic and predictable
  - `release` script = automatic bump based on commits
  - `release:minor/major/patch` = explicit control when needed
  - Same commits always produce same result
- **NFR10:** All configuration files must be version-controlled and documented
  - Scripts added to package.json (already version-controlled)
  - Clear naming convention explains what each script does

### Architecture Compliance

**Package.json Scripts Section:**
- Project already has extensive scripts section
- New version management scripts follow existing naming conventions
- Scripts use `:` separator for namespacing (e.g., `release:minor`, `release:major`)

**Existing Script Patterns (from package.json):**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:web": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    "test": "jest",
    "test:coverage": "jest --coverage --testPathIgnorePatterns=integration",
    "test:watch": "jest --watch"
  }
}
```

**New Scripts to Add (Version Management Group):**
```json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major",
    "release:patch": "standard-version --release-as patch",
    "release:dry-run": "standard-version --dry-run",
    "postrelease": "git push --follow-tags origin main"
  }
}
```

**Script Placement:** Add after existing test scripts, before any custom scripts, to keep related functionality grouped.

### Version Management Scripts Design

**1. `release` - Automatic Semantic Version Bump**

**Command:** `standard-version`

**Behavior:**
- Analyzes all commits since last tag
- Determines version bump automatically:
  - BREAKING CHANGE in footer → major
  - feat: → minor
  - fix: → patch
- Updates package.json and package-lock.json
- Generates/updates CHANGELOG.md
- Creates git commit with message: "chore(release): v{version}"
- Creates annotated git tag: v{version}
- Does NOT push (that's done by postrelease)

**When to use:** Most common case - let conventional commits determine version

**Example:**
```bash
npm run release
# Commits: feat(cli): new feature, fix(web): bug fix
# Result: 2.0.0 → 2.1.0 (minor bump from feat)
```

**2. `release:minor` - Explicit Minor Version Bump**

**Command:** `standard-version --release-as minor`

**Behavior:**
- Forces minor version bump regardless of commits
- Useful when commit history is unclear or incomplete
- Still generates changelog from commits
- Still updates files and creates tag

**When to use:** Override automatic bump logic

**Example:**
```bash
npm run release:minor
# Result: 2.0.0 → 2.1.0 (forced minor)
```

**3. `release:major` - Explicit Major Version Bump**

**Command:** `standard-version --release-as major`

**Behavior:**
- Forces major version bump
- Useful for breaking changes without BREAKING CHANGE footer
- Use when multiple breaking changes need to be released together

**When to use:** Major releases, API breaking changes

**Example:**
```bash
npm run release:major
# Result: 2.0.0 → 3.0.0 (forced major)
```

**4. `release:patch` - Explicit Patch Version Bump**

**Command:** `standard-version --release-as patch`

**Behavior:**
- Forces patch version bump
- Useful for hotfixes or documentation-only releases
- Override when commits would trigger minor bump but you want patch

**When to use:** Hotfixes, small changes

**Example:**
```bash
npm run release:patch
# Result: 2.0.0 → 2.0.1 (forced patch)
```

**5. `release:dry-run` - Preview Version Bump (No Changes)**

**Command:** `standard-version --dry-run`

**Behavior:**
- Analyzes commits and shows what WOULD happen
- Shows version bump calculation
- Shows changelog preview
- Makes NO changes to files
- Creates NO commits or tags

**When to use:** Before actual release to preview changes

**Example:**
```bash
npm run release:dry-run
# Output shows:
# ✔ bumping version in package.json from 2.0.0 to 2.1.0
# ✔ outputting changes to CHANGELOG.md
# ✔ committing package.json and CHANGELOG.md
# ✔ tagging release v2.1.0
# (but nothing actually changed)
```

**6. `postrelease` - Automatic Push After Release**

**Command:** `git push --follow-tags origin main`

**Behavior:**
- npm automatically runs this after `release` script completes
- Pushes the release commit to remote
- Pushes the version tag to remote
- `--follow-tags` ensures tags are pushed with commits

**When to use:** Automatically triggered, no manual invocation

**Flow:**
```bash
npm run release
# 1. standard-version runs (creates commit + tag locally)
# 2. postrelease runs automatically (pushes to remote)
```

**Why separate from release script?**
- Allows dry-run without pushing
- Gives developer chance to review before push
- Can skip push if needed by running standard-version directly

### Testing & Validation Strategy

**Step 1: Test Dry-Run (No Changes)**

```bash
npm run release:dry-run
```

**Expected Output:**
```
✔ bumping version in package.json from 2.0.0 to 2.1.0
✔ outputting changes to CHANGELOG.md
✔ committing package.json and CHANGELOG.md
✔ tagging release v2.1.0
ℹ︎ Skipped commit
ℹ︎ Skipped tag
```

**Validation Checklist:**
- ✅ Version bump is correct (based on recent commits)
- ✅ Changelog preview shows feat/fix sections
- ✅ No files actually changed (git status clean)

**Step 2: Verify Script Execution**

```bash
# Check that scripts exist
npm run release:dry-run  # Should work
npm run release:minor    # Would bump to 2.1.0 (don't actually run)
npm run release:major    # Would bump to 3.0.0 (don't actually run)
npm run release:patch    # Would bump to 2.0.1 (don't actually run)
```

**Step 3: Understand Script Behavior**

The scripts are now ready but should NOT be executed until:
- Story 3.4 runs `--first-release` to create baseline CHANGELOG.md
- All Epic 3 stories are complete
- Developer is ready to make an actual release

**Common Mistakes to Avoid:**

❌ **Don't run `npm run release` yet!**
- Story 3.4 hasn't created CHANGELOG.md yet
- Wait until Epic 3 is complete
- Or use `--first-release` first (Story 3.4)

❌ **Don't manually edit version in package.json**
- Let standard-version handle all version changes
- Manual edits break changelog automation

❌ **Don't commit package.json/CHANGELOG.md separately**
- standard-version creates the commit automatically
- Let it bundle version + changelog in one commit

### Project Context Notes

**Current Project Status:**
- **Version:** 2.0.0 (from package.json)
- **Protected Branches:** main, dev
- **Commit Format:** Enforced by commitlint (Story 1.2)
- **Pre-push Validation:** Full test suite required for main/dev (Story 2.1)

**Release Workflow (After Epic 3 Complete):**

**Manual Release (Developer-Triggered):**
1. Ensure all tests pass: `npm run test:coverage`
2. Preview release: `npm run release:dry-run`
3. Create release: `npm run release`
4. postrelease automatically pushes to main

**Automated Release (Epic 5 - Future):**
1. Developer merges PR to main
2. GitHub Actions workflow triggers
3. Runs `npm run release` automatically
4. Pushes version bump back to main
5. Creates GitHub release

**Version Bump Examples (Based on Recent Commits):**

Recent commit analysis from git log:
- `feat(cli): implement pre-push hook` → minor bump
- `feat(cli): add unit test execution` → minor bump
- `chore(cli): fix linting errors` → no bump (hidden type)

If release ran now:
- Current: 2.0.0
- Bump to: 2.1.0 (2 feat commits since baseline)
- Changelog: 2 features in "Features" section

### Script Documentation

**README/Development Guide Update (Optional for this story):**

Add section explaining version management:

```markdown
## Version Management

This project uses automated semantic versioning via [standard-version](https://github.com/conventional-changelog/standard-version).

### Release Commands

- `npm run release` - Automatic version bump based on conventional commits
- `npm run release:minor` - Force minor version bump (2.0.0 → 2.1.0)
- `npm run release:major` - Force major version bump (2.0.0 → 3.0.0)
- `npm run release:patch` - Force patch version bump (2.0.0 → 2.0.1)
- `npm run release:dry-run` - Preview version bump without making changes

### Release Process

1. Ensure all tests pass: `npm run test:coverage`
2. Preview release: `npm run release:dry-run`
3. Create release: `npm run release`
4. Version bump and changelog are pushed automatically

Version bumps are determined by conventional commits:
- `feat:` commits → minor version bump
- `fix:` commits → patch version bump
- `BREAKING CHANGE:` footer → major version bump
```

### References

**Source Documents:**
- [Source: _bmad-output/epics.md#Epic 3: Semantic Versioning & Changelog Automation]
- [Source: _bmad-output/epics.md#Story 3.3: Add NPM Scripts for Version Management]
- [Source: _bmad-output/stories/3-1-install-configure-standard-version.md - Story 3.1 completion]
- [Source: _bmad-output/stories/3-2-version-config.md - Story 3.2 configuration details]
- [Source: package.json - Existing scripts section, version 2.0.0]
- [Source: docs/project-context.md - Project structure and conventions]

**External Documentation:**
- standard-version CLI: https://github.com/conventional-changelog/standard-version
- npm scripts: https://docs.npmjs.com/cli/v9/using-npm/scripts
- npm lifecycle scripts (postrelease): https://docs.npmjs.com/cli/v9/using-npm/scripts#life-cycle-operation-order

**Related Stories:**
- **Story 3.1** (Complete): Installed standard-version package
- **Story 3.2** (Ready): Created `.versionrc.json` configuration
- **Story 3.3** (Current): Add npm scripts for version management
- **Story 3.4** (Next): Generate initial CHANGELOG.md with `--first-release`
- **Story 4.5** (Epic 4): GitHub Actions will use `release:dry-run` for PR changelog previews
- **Story 5.2** (Epic 5): Release workflow will use `release` script for automated releases

### Complete Package.json Scripts Section

**Scripts to Add to package.json:**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:web": "eslint 'src/**/*.{js,jsx,ts,tsx}'",
    "test": "jest",
    "test:coverage": "jest --coverage --testPathIgnorePatterns=integration",
    "test:watch": "jest --watch",

    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major",
    "release:patch": "standard-version --release-as patch",
    "release:dry-run": "standard-version --dry-run",
    "postrelease": "git push --follow-tags origin main"
  }
}
```

**Key Points:**
- Place version scripts after test scripts for logical grouping
- Use `:` separator for script namespacing (release:minor, release:major)
- postrelease uses special npm lifecycle naming (runs automatically after release)
- All scripts use standard-version, which reads `.versionrc.json` configuration

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Script configuration with successful validation

### Completion Notes List

✅ Added 6 npm scripts to package.json for version management:
  - `release`: Automatic semantic version bump based on conventional commits
  - `release:minor`: Force minor version bump (2.0.0 → 2.1.0)
  - `release:major`: Force major version bump (2.0.0 → 3.0.0)
  - `release:patch`: Force patch version bump (2.0.0 → 2.0.1)
  - `release:dry-run`: Preview version bump without making changes
  - `postrelease`: Automatically push tags and commits after release

✅ Scripts placed after existing scripts, following project conventions
✅ Used `:` separator for namespacing (release:minor, release:major, release:patch)
✅ postrelease uses npm lifecycle naming (runs automatically after release)

✅ Validated scripts with `npm run release:dry-run`:
  - Script executes successfully
  - Correctly calculates minor version bump: 2.0.0 → 2.1.0
  - Identified 2 feat commits triggering minor bump
  - Generated changelog preview with Features and Documentation sections
  - Confirmed tag creation: v2.1.0
  - Verified both package.json and package-lock.json would be bumped
  - No files modified (dry-run operates correctly)

✅ All 7 acceptance criteria validated and passing:
  - release script configured
  - release:minor script configured
  - release:major script configured
  - release:patch script configured
  - release:dry-run script configured
  - postrelease script configured
  - Scripts documented and version-controlled in package.json

### File List

- `package.json` (modified - added 6 version management scripts)
