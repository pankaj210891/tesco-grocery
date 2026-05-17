---
name: resume-pending-task
description: Resume unfinished implementation safely after token/context limit exhaustion while preserving existing functionality, architecture, and progress.
---

# Resume Pending Task Skill

## Purpose

Continue incomplete implementation work safely when:

- token limit exhausted
- context window lost
- Claude session restarted
- partial implementation exists
- merge interrupted
- validations pending

---

# Responsibilities

## 1. Analyze Existing Progress

Before making changes:

- analyze current branch
- analyze git diff
- analyze recent commits
- analyze staged/unstaged changes
- analyze incomplete files
- identify partially implemented features
- identify TODOs/comments
- identify broken flows

Never re-implement blindly.

---

# 2. Preserve Existing Functionality

Must preserve:

- existing APIs
- existing UI behavior
- pagination
- sorting
- filters
- RBAC
- responsive layouts
- Zustand state
- URL param sync
- MongoDB compatibility

Avoid regressions.

---

# 3. Detect Pending Work

Identify:

- unfinished components
- missing APIs
- missing schema updates
- missing validations
- missing tests
- missing RBAC checks
- missing Zustand integration
- missing URL sync
- missing loading/error states

---

# 4. Validate Existing Architecture

Check:

- NextJS architecture
- React patterns
- MongoDB relations
- Mongoose schemas
- Zod validations
- Axios services
- Zustand stores
- reusable components

Follow current project conventions.

---

# 5. Safe Continuation Rules

- continue existing implementation
- avoid duplicate logic
- avoid duplicate APIs
- avoid rewriting completed modules
- avoid unnecessary refactors
- keep changes minimal and modular

---

# 6. Validation Before Continuing

Run/check:

- npm run lint
- npm run type-check
- npm run test
- npm run build

Identify existing failures separately from new failures.

---

# 7. Runtime Safety

Check for:

- hydration issues
- undefined/null access
- invalid MongoDB queries
- invalid ObjectIds
- broken filters
- broken pagination
- duplicate API calls
- stale Zustand state

---

# 8. Git Safety

Before implementation:

- check current branch
- check pending commits
- avoid overwriting uncommitted work
- preserve existing changes

Recommended:

- create backup branch if implementation is large

---

# 9. Testing Responsibilities

Add/update tests for:

- incomplete features
- broken flows
- edge cases
- RBAC restrictions
- filters
- pagination
- sorting
- URL persistence

---

# 10. Completion Requirements

Before marking task complete:

- no TypeScript errors
- no runtime errors
- no lint errors
- no failing tests
- no broken responsive layouts
- no broken RBAC
- no console errors

---

# Output Requirements

Provide:

1. Current implementation status
2. Pending work identified
3. Files updated
4. APIs updated
5. Schema changes
6. Tests added
7. Validation results
8. Remaining pending tasks
9. Risk areas if any

---

# Rules

- Never lose existing functionality
- Never overwrite unrelated code
- Never force reset changes
- Avoid unnecessary rewrites
- Keep architecture scalable
- Keep TypeScript strict typing
- Avoid any type
- Preserve existing project patterns
