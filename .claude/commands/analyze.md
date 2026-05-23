# /analyze

Analyze the provided feature/UI/task deeply before implementation.

STRICTLY DO NOT CODE YET.

First:

- identify which modules/features/files are related automatically
- trace dependencies and connected flows
- inspect surrounding architecture before making assumptions

Analysis Scope:

1. Current architecture
2. Impacted modules/files/components
3. Related hooks/utils/services/types
4. Shared dependencies
5. Existing reusable components
6. State management impact
7. API/business logic impact
8. Responsive/layout impact
9. Theme/design system impact
10. Regression-sensitive areas

Also inspect:

- parent-child component relationships
- shared component usage
- reusable patterns already existing
- feature coupling
- validation flow
- loading/error handling
- permissions/access flow if applicable

Important Rules:

- do not assume behavior
- inspect surrounding files before suggesting implementation
- preserve existing functionality
- avoid unnecessary refactoring
- prefer extension over replacement
- maintain existing architecture consistency

Output Format:

1. Feature Understanding
2. Impacted Files
3. Related Modules Detected
4. Existing Reusable Opportunities
5. Potential Regression Risks
6. Recommended Safe Implementation Strategy
7. Edge Cases To Consider
8. Suggested Incremental Plan

IMPORTANT:
Automatically determine the relevant modules/files instead of asking the user which module to analyze.
Think like a senior engineer onboarding into a large enterprise codebase.
