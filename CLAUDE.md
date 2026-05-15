# Project Context

Tech Stack:

- ReactJS
- NextJS App Router
- TypeScript
- MongoDB
- Mongoose
- Zod
- Zustand
- Axios
- Cypress E2E
- Tailwind CSS

## Coding Principles

- Write production-ready code
- Avoid placeholder implementations
- Use strong TypeScript typing
- Avoid `any`
- Prefer reusable components
- Follow modular architecture
- Prefer server components when possible
- Optimize rendering performance
- Ensure responsive UI
- Maintain accessibility standards

## API Principles

- Validate requests with Zod
- Centralize Axios instance
- Handle errors consistently
- Return typed API responses
- Use RESTful routes

## Git Workflow

- Never push directly to main
- Use feature branches
- Use conventional commits
- Open PRs against develop branch
- Ensure lint/tests/build pass before merge

## Testing

- Use Cypress for E2E
- Cover auth, cart, checkout, search
- Avoid flaky selectors
- Prefer `data-testid`

## Performance

- Lazy load heavy modules
- Use dynamic imports
- Optimize images
- Minimize client components

## Security

- Validate env variables
- Sanitize inputs
- Prevent XSS
- Prevent injection attacks
- Never expose secrets
