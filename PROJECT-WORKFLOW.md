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
