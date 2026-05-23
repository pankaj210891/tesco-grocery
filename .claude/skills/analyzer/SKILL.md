---
name: analyzer
description: Analyze before implementing or changing anything.
---

Before implementing ANY code changes, perform a full impact and regression analysis.

STRICT REQUIREMENTS:

# First analyze the existing implementation deeply:

- understand component hierarchy
- understand state flow
- understand shared dependencies
- understand reusable components
- understand API integrations
- understand routing impact
- understand styling inheritance
- understand responsive behavior
- understand feature coupling

# Before modifying any file:

- explain WHY the file must change
- explain potential regression risks
- explain what existing functionality could be affected
- identify shared logic dependencies

# Never assume behavior.

If unclear:

- inspect related components/hooks/utils
- inspect parent-child interaction
- inspect existing business logic
- inspect validation flow

# Implementation strategy:

- prefer extension over replacement
- prefer composition over rewriting
- isolate changes
- avoid touching stable logic unnecessarily

# Mandatory Regression Protection:

After implementation verify:

- existing flows still work
- old UI behavior preserved
- keyboard interactions preserved
- mobile responsiveness preserved
- pagination/search/filter/sort preserved
- API payloads unchanged
- form validation unaffected
- theme consistency preserved
- loading/error states preserved

# Enterprise Safety Rules:

- avoid hardcoded values
- avoid duplicated business logic
- avoid inline complex logic
- avoid unnecessary state
- avoid breaking reusable components
- avoid large component rewrites

# Before final output:

Provide:

- impacted files
- regression risk summary
- edge cases considered
- test cases checklist
- rollback-safe areas

# MOST IMPORTANT:

Do not prioritize speed over stability.
Think like a developer working on a live enterprise production application with real users.
