# BMAD Best Practices Guide

**Purpose:** Guardrails and best practices for effectively using BMAD agents and workflows

**Audience:** You (the human developer/PM invoking BMAD)

**Last Updated:** 2026-01-07

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Story Creation Best Practices](#story-creation-best-practices)
3. [Documentation Maintenance](#documentation-maintenance)
4. [Project Context Management](#project-context-management)
5. [Workflow Execution Guidelines](#workflow-execution-guidelines)
6. [Common Pitfalls & How to Avoid Them](#common-pitfalls--how-to-avoid-them)
7. [Quality Gates & Validation](#quality-gates--validation)
8. [Emergency Procedures](#emergency-procedures)

---

## Core Principles

### The BMAD Philosophy

**✅ DO:**
- Let BMAD agents handle detailed analysis and documentation
- Trust the workflows to enforce consistency
- Review outputs before accepting (you're the final decision maker)
- Maintain single sources of truth (epics.md, architecture.md, project-context.md)
- Use A/P/C menus when offered (don't rush past them)

**❌ DON'T:**
- Manually edit generated files without updating source documents
- Skip validation steps to save time (they catch critical issues)
- Override BMAD patterns without documenting the deviation
- Create stories outside of BMAD workflows (breaks traceability)
- Ignore warnings or "CRITICAL" notifications from workflows

### State Management Rule

**Golden Rule:** BMAD workflows track state in YAML/MD files. Always let workflows update state files.

**Files BMAD Owns:**
- `_bmad-output/sprint-status.yaml` - Sprint and story state
- `_bmad-output/stories/*.md` - Story details and progress
- `_bmad-output/architecture.md` - Architectural decisions
- `_bmad-output/epics.md` - Epic and story definitions

**Your Responsibility:**
- Keep source requirements updated (if using a PRD)
- Maintain project-context.md when adding new critical rules
- Update epics.md when requirements fundamentally change

---

## Story Creation Best Practices

### Before Creating Stories

**1. Ensure Epic Structure is Solid**
- ✅ Epic has clear description and acceptance criteria in `epics.md`
- ✅ Epic is broken down into logical user stories
- ✅ Story dependencies are documented
- ✅ Story sequence makes sense (foundation before features)

**2. Check Implementation Readiness**
```bash
/bmad-bmm-workflows-check-implementation-readiness
```
- Run this BEFORE starting a new epic
- Catches gaps in PRD, Architecture, or Epic definitions
- Saves hours of rework

### During Story Creation

**Use the Right Workflow:**
```bash
/bmad-bmm-workflows-create-story
```

**Let the Workflow:**
- ✅ Extract context from epics.md, architecture.md, project-context.md
- ✅ Generate detailed tasks and subtasks
- ✅ Create acceptance criteria aligned with epic
- ✅ Mark story as "ready-for-dev"

**Your Role:**
- Review the generated story file
- Validate tasks match your mental model
- Request refinements if needed (use the A/P/C menu)
- Accept when satisfied

### After Story Creation

**Validate the Story File:**
- [ ] Story file exists in `_bmad-output/stories/[epic]-[story].md`
- [ ] Status is "ready-for-dev" in both story file AND sprint-status.yaml
- [ ] All acceptance criteria are testable
- [ ] Tasks are granular enough (30min - 2hr each)
- [ ] Dependencies on other stories are noted

**Red Flags:**
- ❌ Story file too generic (lacks project-specific details)
- ❌ Acceptance criteria vague ("should work well")
- ❌ Missing references to architecture.md or project-context.md
- ❌ Tasks too large (>4 hours) or too small (<15 min)

---

## Documentation Maintenance

### The Holy Trinity (Keep These in Sync)

**1. `architecture.md` - Architectural Decisions**
- **Update When:** Adding new tech, changing patterns, establishing new boundaries
- **How:** Use `/bmad-bmm-workflows-create-architecture` (for major changes) or manual edits for minor additions
- **Validate:** Ensure new decisions don't conflict with existing ones

**2. `project-context.md` - AI Agent Rules**
- **Update When:** Adding new critical implementation rules that ALL agents must follow
- **How:** Manual edits (this is YOUR voice to future AI agents)
- **Validate:** Rules are clear, enforceable, and don't contradict each other

**3. `epics.md` - Requirements Source of Truth**
- **Update When:** Requirements change, new epics added, stories modified
- **How:** Manual edits to epic definitions, then regenerate affected story files
- **Validate:** Run `/bmad-bmm-workflows-check-implementation-readiness` after major changes
- **Note:** For this project, `epics.md` serves as the PRD equivalent (see "PRD vs Epics" below)

### PRD vs Epics: When You Need Which

**BMAD Prefers but Doesn't Require a PRD**

The implementation readiness workflow will warn about a missing PRD, but this is acceptable for:
- ✅ Brownfield projects (enhancing existing systems)
- ✅ Internal tools (not customer-facing products)
- ✅ Small teams with direct requirements ownership
- ✅ CI/CD automation projects (like Epics 1-6)

**Your Project: `epics.md` IS Your Requirements Source**

For `wp-content-automation`, we use:
- **`epics.md`** = Requirements source of truth (PRD equivalent)
- **`architecture.md`** = Architectural decisions and patterns
- **`stories/*.md`** = Implementation-level task breakdowns

**When Implementation Readiness Asks About PRD:**

Respond with:
```
"epics.md serves as our requirements source of truth. 
This is an internal brownfield enhancement project. 
Proceed with Architecture + Epics/Stories assessment."
```

Then select **[C] Continue to File Validation**

**If You Later Need a PRD:**

Use `/bmad-bmm-workflows-create-prd` to generate a formal PRD from your epics.md, but this is optional for internal projects.

### Documentation Synchronization Rules

**After Changing `epics.md`:**
1. Run `/bmad-bmm-workflows-create-story` for affected stories (regenerates with new context)
2. Update sprint-status.yaml if story sequence changed
3. Notify team if story scope changed significantly

**After Changing `architecture.md`:**
1. Update `project-context.md` if new mandatory patterns added
2. Review in-progress stories for architectural conflicts
3. Run `/bmad-bmm-workflows-check-implementation-readiness` if major structural changes

**After Changing `project-context.md`:**
1. Review existing code for violations of new rules
2. Update `architecture.md` if rules imply architectural decisions
3. Brief AI agents on new rules in next workflow invocation

### Documentation Validation Checklist

**Before Starting New Sprint:**
- [ ] All "done" stories from last sprint reflected in code
- [ ] sprint-status.yaml matches actual git branch state
- [ ] architecture.md includes any new patterns established last sprint
- [ ] project-context.md updated with any new critical rules discovered

---

## Project Context Management

### When to Add Rules to `project-context.md`

**Add a Rule When:**
- ✅ An AI agent made a mistake that you want ALL future agents to avoid
- ✅ You discover a critical pattern that must be followed (e.g., "Always use Prisma singleton")
- ✅ A dependency constraint exists that agents must respect
- ✅ You establish a new architectural boundary

**Examples of Good Rules:**
```markdown
**Rule #6: Database Migrations**
- ALL schema changes must use Prisma migrations (`npm run db:migrate`)
- NEVER use raw SQL for schema modifications
- Migration files must be committed to version control
- Rationale: Ensures database schema is version-controlled and reproducible
```

**Examples of Bad Rules (Too Specific):**
```markdown
❌ Rule #7: The login button should be blue
(This is too specific - belongs in UX design doc, not project-context)

❌ Rule #8: Use async/await instead of .then()
(This is a style preference - belongs in .eslintrc, not critical architectural rule)
```

### Project Context Best Practices

**DO:**
- Write rules in imperative language (MUST, NEVER, ALWAYS)
- Include rationale (why this rule exists)
- Reference architecture.md for detailed patterns
- Number rules for easy reference
- Keep rules concise (1-3 sentences + rationale)

**DON'T:**
- Duplicate information from architecture.md (reference it instead)
- Add style preferences (use linting tools for that)
- Write vague rules ("code should be clean")
- Remove old rules without documenting why (add "DEPRECATED" if needed)

---

## Workflow Execution Guidelines

### General Workflow Best Practices

**1. Always Start with Sprint Status**
```bash
/bmad-bmm-workflows-sprint-status
```
- Orients you to current state
- Identifies blockers and risks
- Recommends next action

**2. Follow the Recommended Flow**
```
sprint-status → create-story → dev-story → code-review → sprint-status
```

**3. Use A/P/C Menus Strategically**

**When to Choose [A] Advanced Elicitation:**
- You need deeper exploration of a complex problem
- The proposed solution feels incomplete
- You want alternative approaches considered

**When to Choose [P] Party Mode:**
- You want multiple expert perspectives
- Decision involves tradeoffs you're unsure about
- You suspect the approach might have hidden issues

**When to Choose [C] Continue:**
- The proposal looks good and complete
- You're confident in the approach
- You want to move forward with implementation

### Workflow-Specific Guidelines

#### `/bmad-bmm-workflows-create-story`

**Before Running:**
- Ensure Epic is fully defined in epics.md
- Check that previous stories in same epic are clear
- Review architecture.md for relevant patterns

**During Execution:**
- Review generated tasks carefully
- Ensure acceptance criteria are testable
- Validate story aligns with epic goals

**After Completion:**
- Story file created in `_bmad-output/stories/`
- sprint-status.yaml updated
- Story marked "ready-for-dev"

#### `/bmad-bmm-workflows-dev-story`

**Before Running:**
- Story must be "ready-for-dev" status
- Understand acceptance criteria thoroughly
- Ensure dependencies (other stories) are complete

**During Execution:**
- Let the workflow implement tasks sequentially
- Review each task completion before proceeding
- Validate against architecture.md patterns

**After Completion:**
- All tasks marked complete in story file
- Code committed to git
- Tests passing (when testing framework ready)
- Story marked "in-review"

#### `/bmad-bmm-workflows-code-review`

**Before Running:**
- Story must be "in-review" status
- Code must be committed
- You should have reviewed the code yourself first

**During Execution:**
- **Expect problems to be found** (adversarial review finds 3-10 issues minimum)
- Take criticism seriously (workflow is designed to be harsh)
- Accept auto-fix offers if you trust the proposed changes

**After Completion:**
- Issues documented in story file
- Either: Story marked "done" (if passed) OR back to "in-progress" (if issues found)
- If issues found: Fix them, then run code-review again

---

## Common Pitfalls & How to Avoid Them

### Pitfall #1: Manual Story File Edits

**Problem:** You edit a story file directly, then regenerate it with `/create-story`, losing your changes.

**Solution:**
- ✅ Edit `epics.md` (source of truth) then regenerate story
- ✅ If story-specific changes needed, mark story as "custom" and don't regenerate
- ✅ Use story file metadata to track manual modifications

### Pitfall #2: Skipping Validation Workflows

**Problem:** You skip `/check-implementation-readiness` and discover mid-sprint that 60% of requirements have no stories.

**Solution:**
- ✅ **ALWAYS** run implementation readiness check before starting new epic
- ✅ Budget 30-60 min for this validation step
- ✅ Fix gaps BEFORE starting development

### Pitfall #3: Ignoring sprint-status.yaml

**Problem:** sprint-status.yaml says story is "backlog" but you start developing it anyway, causing state conflicts.

**Solution:**
- ✅ Check `/sprint-status` before starting work
- ✅ Let workflows manage state transitions
- ✅ Only manually edit sprint-status.yaml if workflow failed to update it

### Pitfall #4: Outdated Architecture Document

**Problem:** You establish new patterns in code but don't update architecture.md, so AI agents don't follow them.

**Solution:**
- ✅ Update architecture.md immediately when new patterns established
- ✅ Run retrospective after each epic to capture lessons learned
- ✅ Add new patterns to project-context.md if they're mandatory

### Pitfall #5: Over-Detailed Story Files

**Problem:** Story file has 50 tiny tasks that take longer to manage than to implement.

**Solution:**
- ✅ Keep tasks at 30min - 2hr granularity
- ✅ Subtasks for complex tasks only
- ✅ Trust AI agents to handle implementation details

### Pitfall #6: Bypassing Git Hooks

**Problem:** Using `--no-verify` too often defeats the purpose of Epic 1-2 automation.

**Solution:**
- ✅ Only use `--no-verify` for genuine emergencies (documented in Story 2.4)
- ✅ Fix validation failures instead of bypassing them
- ✅ If hooks are too strict, update the hook rules

### Pitfall #7: Mixing BMAD and Non-BMAD Work

**Problem:** Some stories created via BMAD, others created manually, causing inconsistent tracking.

**Solution:**
- ✅ **ALL stories** must go through `/create-story` workflow
- ✅ If doing quick hotfixes, create a story retroactively
- ✅ Maintain traceability from requirement → epic → story → code

---

## Quality Gates & Validation

### Pre-Sprint Quality Gate

**Before Starting Epic Implementation:**
```bash
/bmad-bmm-workflows-check-implementation-readiness
```

**Must Pass:**
- [ ] PRD exists and covers all epic requirements (or epics.md is comprehensive)
- [ ] Architecture.md has decisions for all epic technical needs
- [ ] All epic stories have implementation files in `stories/` directory
- [ ] No critical gaps in requirement coverage

**If Fails:** Address gaps before development starts (saves rework)

### Mid-Sprint Quality Gate

**After Completing Each Story:**
```bash
/bmad-bmm-workflows-code-review
```

**Code Review Playbook:**
- Follow the structured checklist in `docs/bmad-code-review-playbook.md`

**Must Pass:**
- [ ] Code follows architecture.md patterns
- [ ] No violations of project-context.md rules
- [ ] Tests written and passing (when framework ready)
- [ ] Acceptance criteria met

**If Fails:** Fix issues before marking story "done"

### Post-Epic Quality Gate

**After Completing All Epic Stories:**
```bash
/bmad-bmm-workflows-retrospective
```

**Captures:**
- [ ] Overall epic success assessment
- [ ] Lessons learned
- [ ] New information that impacts future epics
- [ ] Pattern refinements for architecture.md

---

## Emergency Procedures

### When BMAD Workflow Fails Mid-Execution

**Symptoms:**
- Workflow crashes or hangs
- Invalid state in sprint-status.yaml
- Story file corrupted

**Recovery Steps:**
1. **Don't Panic** - BMAD files are markdown/YAML, easily fixable
2. **Check Git History** - All BMAD files should be version controlled
3. **Restore from Git** if file corrupted: `git checkout HEAD -- _bmad-output/stories/X-Y.md`
4. **Manual State Fix** if needed: Edit sprint-status.yaml to correct state
5. **Re-run Workflow** after state corrected
6. **Report Issue** to BMAD team if reproducible

### When Story Needs Emergency Changes After "Done"

**Scenario:** Critical bug found in story marked "done", need hotfix.

**Recommended Flow:**
1. Create new story: "Hotfix: [Original Story] - [Bug Description]"
2. Use `/create-story` to generate story file (even if simple)
3. Implement fix via `/dev-story`
4. Code review via `/code-review`
5. Mark original story with "See Also: Story X.Y (hotfix)"

**Alternative (Discouraged):**
- Manually fix code, re-open story, mark as "in-progress", fix, re-review
- Risk: Breaks audit trail of when story was actually "done"

### When Git Hooks Block Emergency Commit

**Scenario:** Production is down, you need to commit a quick fix, but pre-commit hooks fail.

**Emergency Bypass (Story 2.4):**
```bash
git commit --no-verify -m "fix: emergency patch for production issue #123"
```

**Post-Emergency Procedure:**
1. Fix validation failures ASAP after emergency resolved
2. Create follow-up story to address root cause
3. Update project-context.md if new rule needed to prevent similar issues

---

## Quick Reference Cheat Sheet

### Most Common Workflow Sequence

```bash
# 1. Check current state
/bmad-bmm-workflows-sprint-status

# 2. Create next story (if doesn't exist)
/bmad-bmm-workflows-create-story

# 3. Implement story
/bmad-bmm-workflows-dev-story

# 4. Review code
/bmad-bmm-workflows-code-review

# 5. Repeat for next story
# (Loop back to step 1)

# 6. After epic complete
/bmad-bmm-workflows-retrospective
```

### Files to Update Manually

- `_bmad-output/epics.md` - When requirements change
- `_bmad-output/project-context.md` - When adding critical AI agent rules
- `_bmad-output/architecture.md` - When establishing new architectural patterns
- `.env.local` - When adding new environment variables

### Files BMAD Updates (Don't Edit Manually)

- `_bmad-output/sprint-status.yaml` - Workflow manages state
- `_bmad-output/stories/*.md` - Workflow generates and updates
- `_bmad-output/analysis/*` - Workflow outputs

### When in Doubt

1. Run `/bmad-bmm-workflows-sprint-status` to see current state
2. Consult this best practices guide
3. Review `architecture.md` for patterns
4. Check `project-context.md` for rules
5. Ask BMAD agent for guidance (they have context)

---

## Appendix: BMAD Document Hierarchy

```
Source of Truth (You Control):
├── epics.md               # Requirements breakdown
├── project-context.md     # Critical AI agent rules
└── architecture.md        # Architectural decisions

Generated by BMAD (Workflow Controlled):
├── sprint-status.yaml     # Current sprint state
├── stories/*.md           # Individual story details
└── analysis/*.md          # Research and analysis outputs

External (Version Controlled):
└── [Your actual codebase] # Implementation
```

**Synchronization Rule:** Changes to "Source of Truth" files may require regenerating "Generated by BMAD" files.

---

**Remember:** BMAD is a tool to enforce consistency and quality. Trust the workflows, but always review outputs. You're the final decision maker.

**Questions or Issues?** Consult this guide first, then ask a BMAD agent for clarification.
