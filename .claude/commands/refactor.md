# /refactor

Now perform a SAFE ENTERPRISE REFACTOR of the implemented feature WITHOUT changing existing functionality or business behavior.

STRICT RULES:

- Do NOT break existing functionality
- Do NOT change APIs
- Do NOT change business logic
- Do NOT change UI behavior unnecessarily
- Do NOT introduce architectural drift
- Do NOT aggressively rewrite stable code

Primary Goals:

1. Improve reusability
2. Reduce duplication
3. Improve maintainability
4. Improve readability
5. Improve scalability
6. Improve component composition
7. Improve separation of concerns

Focus Areas:

- extract reusable components
- extract reusable hooks
- extract shared utilities/helpers
- simplify large components
- reduce prop drilling
- remove duplicate logic
- standardize patterns
- improve folder organization
- improve TypeScript typing
- improve performance where safe

Architecture Rules:

- prefer composition over inheritance
- prefer extension over replacement
- preserve backward compatibility
- isolate refactors incrementally
- avoid touching unrelated modules

Performance Rules:

- reduce unnecessary renders
- memoize expensive computations where beneficial
- avoid duplicated state
- avoid unnecessary effects
- optimize large lists/components carefully

Before every refactor:

- explain WHY it is needed
- explain regression risks
- explain impacted files
- explain safer alternative approaches

After refactor:
Provide:

1. Refactor summary
2. Reusability improvements
3. Duplication removed
4. Performance improvements
5. Regression-sensitive areas
6. Recommended testing checklist
7. Future improvement opportunities

IMPORTANT:
Think like a principal engineer refactoring a live enterprise production application with real users and long-term maintainability requirements.
