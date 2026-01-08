# BMAD Code Review Playbook

Purpose: Provide a consistent, auditable code review process for BMAD stories.
Audience: Future agents performing story reviews.

## Core Principles

1. Verify reality, not claims. Story checklists are hypotheses until proven.
2. Review the actual code and diff, not just the story file.
3. Document discrepancies in a structured, learnable way.
4. Keep BMAD workflow state accurate (story status + sprint status).

## Required Inputs

- Story file: `_bmad-output/stories/<story>.md`
- Git diff: `git diff --name-only` (and `--cached` if staged)
- Project context: `_bmad-output/project-context.md` (if present)
- Architecture: `_bmad-output/architecture.md` (if present)

## Review Workflow (Structured)

1. Read the full story file.
2. Extract:
   - Acceptance Criteria (AC)
   - Tasks/Subtasks with completion status
   - Dev Agent Record > File List
3. Collect actual changes from git:
   - `git diff --name-only`
   - `git diff --cached --name-only`
4. Build a combined review list:
   - Story File List + git changed files
5. Validate each AC against the code.
6. Audit each checked task for real evidence.
7. Inspect code quality:
   - Security, performance, error handling, maintainability
8. Record findings with severity:
   - HIGH: AC not implemented, task marked done but not done, security issue
   - MEDIUM: undocumented file changes, insufficient tests, unclear behavior
   - LOW: style or clarity improvements

## Documentation Standard (Claimed vs Actual vs Fix)

When discrepancies are found, add a section in the story file:

"""
## Review Corrections (Code Review)
- **Claimed:** <what the story said>
  **Actual:** <what the code shows>
  **Fix Applied:** <what you changed or what must be done next>
"""

## Evidence Standards

- Capture evidence in the story file under an "Evidence" or "Review Corrections" section.
- Prefer command output excerpts (short, specific).
- If verification is blocked (dirty tree, missing remote), document the blocker.

## Status Updates (BMAD Alignment)

- If all ACs are implemented and verified: set Status to `done`.
- If any HIGH/MEDIUM issues remain or verification is incomplete: `in-progress` or `review`.
- Always sync `_bmad-output/sprint-status.yaml` when story status changes.

## Do Not

- Do not claim verification without evidence.
- Do not mark tasks as complete without proof.
- Do not leave git vs story discrepancies undocumented.

## Template: Review Summary Block

"""
**Review Summary**
- Story: <story id>
- Git vs Story discrepancies: <count>
- Issues: <high>/<medium>/<low>
- Verification status: <verified/partial/blocked>
"""

## Recommended Follow-ups

- If verification is blocked, add a follow-up task in the story.
- If fixes are applied, update the Change Log.
- If docs differ from behavior, update docs and note the correction.
