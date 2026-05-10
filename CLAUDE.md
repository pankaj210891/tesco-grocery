@AGENTS.md

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

These Git rules are mandatory defaults for all future tasks in this project.

FEATURE DEVELOPMENT & DATA ARCHITECTURE RULES (MANDATORY)

You must strictly follow the feature implementation and data architecture rules below for ALL future development tasks in this project.

---

## GENERAL FEATURE IMPLEMENTATION RULES

- Every new feature must be production-ready
- Always analyze scalability before implementation
- Maintain reusable and modular architecture
- Avoid temporary or shortcut implementations
- Ensure all new functionality integrates cleanly with existing architecture
- Maintain consistent TypeScript typing
- Follow enterprise-level coding standards
- Ensure responsiveness across:
  - desktop
  - tablet
  - mobile

---

## CRUD & DATABASE IMPLEMENTATION RULES

IMPORTANT:

Whenever a new feature or functionality is requested:

IF the feature requires data persistence, CRUD operations, user-generated data, admin management, vendor management, or dynamic content:

THEN ALWAYS IMPLEMENT:

1. Database collection/model
2. MongoDB schema
3. REST API routes
4. Validation logic
5. Proper TypeScript types/interfaces
6. CRUD operations
7. Error handling
8. Loading states
9. Authorization checks (if required)
10. Backend integration

DO NOT:

- store important application data only in local state
- use mock data permanently
- use localStorage for primary business data
- create frontend-only fake CRUD flows

---

## LOCAL STORAGE RULES

Use localStorage ONLY when appropriate for:

- theme preference
- temporary UI preferences
- non-critical cached UI state
- recently viewed products
- optional client-side persistence

DO NOT use localStorage for:

- products database
- categories
- users
- orders
- reviews
- vendor data
- admin data
- offers
- authentication source of truth
- critical business logic

Primary business data must always come from:

- MongoDB
- REST APIs
- authenticated backend services

---

## WHEN IMPLEMENTING NEW FEATURES

Always determine:

1. Does this feature require persistent data?
2. Does it require CRUD operations?
3. Does it require API integration?
4. Does it require database schema?
5. Does it require admin/vendor management?
6. Does it require authentication/authorization?
7. Does it require scalable backend architecture?

If YES:

- automatically implement backend architecture properly

---

## REQUIRED IMPLEMENTATION FLOW

For every CRUD-based feature:

1. Create MongoDB schema/model
2. Create TypeScript interfaces/types
3. Create REST API endpoints
4. Add validation
5. Add reusable service/util layer if needed
6. Connect frontend with APIs
7. Implement loading/error handling
8. Add admin/vendor management if applicable
9. Ensure scalability and reusability

---

## REQUIRED CRUD OPERATIONS

Unless explicitly stated otherwise, implement:

- Create
- Read
- Update
- Delete

with:

- validation
- error handling
- API responses
- proper HTTP status codes

---

## REST API RULES

- Use RESTful naming conventions
- Use proper HTTP methods:
  - GET
  - POST
  - PUT/PATCH
  - DELETE

- Keep API structure scalable
- Separate:
  - controllers
  - services
  - database utilities
  - validation logic (if architecture supports)

- Use consistent API response format

---

## AUTHORIZATION RULES

If feature contains:

- admin functionality
- vendor functionality
- user-specific data

THEN:

- implement role-based authorization
- validate permissions properly
- secure API routes

---

## AI IMPLEMENTATION RULES

For every new feature:

- First analyze whether database integration is required
- Automatically suggest schema design if needed
- Automatically suggest REST API architecture if needed
- Automatically suggest CRUD endpoints if needed
- Avoid frontend-only fake implementations
- Prefer scalable backend-driven architecture
- Maintain clean separation between frontend and backend responsibilities

---

## EXAMPLES

Example:
If feature = Product Reviews

Then automatically implement:

- Review schema
- Review APIs
- Review CRUD
- Rating aggregation
- Validation
- Database integration
- Admin moderation support

Example:
If feature = Store Locator

Then automatically implement:

- Store schema
- Store APIs
- CRUD management
- Search APIs
- Admin management

---

## MANDATORY DEFAULT RULE

Whenever a feature logically requires database-driven functionality:

ALWAYS implement:

- MongoDB schema
- REST APIs
- CRUD architecture
- validation
- scalable backend integration

unless explicitly instructed NOT to.
