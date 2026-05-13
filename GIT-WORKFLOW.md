GIT STRATEGY & WORKFLOW RULES (MANDATORY)

You must strictly follow the Git workflow and branching strategy below for ALL future development tasks in this project.

---

## BRANCHING STRATEGY

MAIN BRANCHES:

1. master (or main)

- Production-ready branch
- Stores official release history
- Must always remain stable and deployable
- Direct commits are NOT allowed unless explicitly instructed

2. develop

- Main integration branch
- All ongoing development merges here first
- Base branch for all feature and bugfix work

---

## SUPPORTING BRANCHES

1. feature/\*
   Purpose:

- New feature development

Rules:

- Must be created from develop
- Must merge back into develop

Naming Convention:

- feature/<feature-name>

Examples:

- feature/store-locator
- feature/dark-mode
- feature/product-reviews
- feature/admin-dashboard

---

2. bugfix/\*
   Purpose:

- Non-production bug fixes
- Fixes targeting develop branch

Rules:

- Must be created from develop
- Must merge back into develop

Naming Convention:

- bugfix/<issue-name>

Examples:

- bugfix/navbar-alignment
- bugfix/mobile-layout
- bugfix/filter-state

---

3. release/\*
   Purpose:

- Release preparation
- Stabilization and testing before production release

Used For:

- final bug fixes
- testing
- version updates
- performance polishing
- deployment preparation

Rules:

- Must be created from develop
- Must merge into BOTH:
  - master
  - develop

Naming Convention:

- release/v<version>

Examples:

- release/v1.0.0
- release/v1.1.0

---

4. hotfix/\*
   Purpose:

- Urgent production fixes

Rules:

- Must be created from master
- Must merge into BOTH:
  - master
  - develop

Naming Convention:

- hotfix/<issue-name>

Examples:

- hotfix/login-crash
- hotfix/payment-failure

---

## DEVELOPMENT WORKFLOW

RULES:

- All development happens through branches
- Never work directly on master
- Prefer pull-request-style workflow even in solo development
- Keep commit history clean and readable
- Use small, logical commits
- Recommend Git commands before major branch operations
- Recommend commit message after every implemented feature

---

## FEATURE DEVELOPMENT FLOW

1. Switch to develop:
   git checkout develop

2. Pull latest changes:
   git pull origin develop

3. Create feature branch:
   git checkout -b feature/<feature-name>

4. Work and commit changes

5. Push feature branch:
   git push origin feature/<feature-name>

6. Merge back into develop after completion

---

## RELEASE FLOW

1. Create release branch from develop:
   git checkout -b release/v<version>

2. Perform:

- testing
- polishing
- final fixes

3. Merge release branch into:

- master
- develop

4. Tag release version

---

## HOTFIX FLOW

1. Create hotfix branch from master:
   git checkout -b hotfix/<issue-name>

2. Apply urgent fix

3. Merge into:

- master
- develop

---

## COMMIT MESSAGE CONVENTION

Use Conventional Commits format:

feat:

- new feature

fix:

- bug fix

refactor:

- code improvement

style:

- UI/styling updates

docs:

- documentation changes

test:

- testing updates

chore:

- tooling/config/setup updates

---

## COMMIT MESSAGE EXAMPLES

feat: implement store locator page
feat: add dark mode support
feat: create vendor product CRUD APIs
fix: resolve cart hydration mismatch
fix: correct mobile navbar alignment
refactor: optimize category filtering logic
style: improve homepage responsiveness
docs: update project setup instructions
chore: configure mongodb environment variables

---

## AI DEVELOPMENT RULES

- Always recommend appropriate branch name before starting feature work
- Always suggest commit message after implementation
- Never suggest direct development on master
- Maintain clean Git workflow discipline
- Keep commits feature-focused
- Avoid giant commits containing unrelated changes
- Suggest release branch creation when multiple features are completed
- Suggest hotfix workflow only for production-critical issues
- Maintain enterprise-level Git standards throughout the project

Before moving to any new requirement or feature, kindly commit and push the current working code to the repository.

Requirements:

- Ensure the current implementation is fully tested and stable before committing.
- Use meaningful commit messages describing the completed work.
- Push all latest changes to the appropriate branch before starting the next task.
- Avoid keeping uncommitted or local-only changes while switching requirements.
- Confirm there are no build errors, lint issues, or broken functionality before push.
- Keep the repository updated incrementally for easier tracking and rollback if needed.

These Git rules are mandatory defaults for all future tasks in this project.
