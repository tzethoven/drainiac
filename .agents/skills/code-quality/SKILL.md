---
name: code-quality
description: Reviews code for quality issues against project standards — TypeScript strictness, naming conventions, component design, error handling, and Svelte 5 patterns. Pass a folder path to scope the review, or 'feature' to review only the current feature branch diff.
argument-hint: [folder path | feature]
---

# Code Quality Review

Review code for quality issues against the project's standards. Report findings grouped by severity with specific file locations.

**Do not automatically fix any issues.** Present all findings to the user and let them decide which ones to address.

## Scope

Determined by $ARGUMENTS:

- **Folder path** (e.g. `src/lib/components/capture`) — review that folder only
- **`feature`** — review only files changed in the current feature branch vs `staging`:
  ```bash
  git diff staging...HEAD --name-only   # changed files
  git diff staging...HEAD               # full diff
  ```
  Only report issues in new or modified lines. You may read surrounding code for context.

Also read `.agents/rules/code-standards.md` before starting to apply the project's specific conventions.

## What to Check

### 1. TypeScript
- No `any` types — use proper typing or `unknown`
- All props, API responses, and data shapes must have defined interfaces or types
- No implicit `any` from missing type annotations on function parameters
- Props interfaces should be defined for all components

### 2. Svelte 5
- **Runes usage**:
  - All reactive state uses runes (`$state`, `$derived`, `$effect`)
  - No legacy reactive statements (`$:`)
  - No legacy `export let` for props — must use `$props()`
  - Bindable props use `$bindable()` within `$props()`
- **Component patterns**:
  - Components should have one clear responsibility — flag components that mix concerns
  - Reusable logic extracted into `.svelte.ts` modules, not copy-pasted inline
  - Use snippets (`{#snippet}` / `{@render}`) instead of slots for content projection
  - Event handlers use native DOM events (`onclick`, `oninput`) not `on:` directives
- **State management**:
  - Component-local state uses runes, not stores
  - Stores only for cross-component shared state
  - Derived values use `$derived`, not manual tracking
  - Side effects use `$effect`, not callbacks

### 3. SvelteKit
- **Data loading**:
  - Server-side data fetching uses `load` functions in `+page.ts` / `+page.server.ts`
  - Sensitive operations (database, env vars) use `+page.server.ts`, not `+page.ts`
- **Form handling**:
  - Mutations use SvelteKit form actions, not client-side API calls
  - Actions return `{ success, data, error }` pattern
- **API endpoints**:
  - Proper HTTP methods (GET, POST, etc.) in `+server.ts` files
  - Request validation before processing
- **Routing**:
  - Correct file naming (`+page.svelte`, `+layout.svelte`, `+error.svelte`)
  - Dynamic routes use `[param]` syntax

### 4. Naming & Conventions
- Components: PascalCase files (`ItemCard.svelte`)
- Rune modules: kebab-case with `.svelte.ts` (`transcription-store.svelte.ts`)
- Utilities: kebab-case (`item-utils.ts`)
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase

### 5. Code Cleanliness
- No commented-out code
- No unused imports or variables
- Functions kept under ~50 lines where reasonable
- No hardcoded magic strings or numbers that should be constants
- No console.logs in production code (unless intentional logging)

### 6. Error Handling
- Server-side code uses try/catch and returns structured errors
- Form actions return `{ success, data, error }` pattern
- No silent error swallowing (empty catch blocks)
- User-friendly error messages, not raw exceptions

### 7. Input Validation
- All form action inputs validated with Zod before use
- API endpoint data validated before processing
- No raw unvalidated data passed to database or sensitive operations

### 8. Database
- No schema changes without prior user confirmation
- Queries select only the fields needed — no over-fetching
- Proper typing for database results

### 9. PWA Patterns
- Service worker correctly registered and updated
- Cache strategies appropriate for content type
- Offline fallbacks where needed

## Analysis Process

1. **Identify scope** — list the files to review based on $ARGUMENTS
2. **Read code standards** — load `.agents/rules/code-standards.md`
3. **Review each file** — check against all categories above
4. **Group findings by severity** — see guide below

## Output

```markdown
# Code Quality Review

**Date:** YYYY-MM-DD
**Scope:** [folder path | feature diff | "full codebase"]

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Must Fix   | X |
| 🟡 Should Fix | X |
| 🔵 Minor      | X |

---

## 🔴 Must Fix

### [Title]

**File:** `path/to/file.ts` (line X)
**Issue:** What the problem is and why it matters
**Suggestion:**
\```typescript
// Corrected code
\```

---

## 🟡 Should Fix

(Same format)

## 🔵 Minor

(Same format)

## ✅ No issues found

(if clean)
```

### Severity Guide

- **🔴 Must Fix** — Violates project standards, likely to cause bugs or type errors, or breaks conventions that affect the whole team. Examples: using legacy Svelte syntax, missing type annotations, unvalidated user input.
- **🟡 Should Fix** — Degrades maintainability, inconsistent with project patterns, or likely to cause confusion. Examples: mixed naming conventions, functions over 100 lines, missing error handling.
- **🔵 Minor** — Style or preference issues, low impact. Examples: could extract a constant, could simplify logic slightly.

## Rules

- Only flag **real issues** with specific file paths and line numbers
- Don't flag subjective style preferences not defined in code standards
- Don't flag test files for code quality (different conventions apply)
- When scope is `feature`, only report issues in new or modified lines
- Provide concrete, actionable suggestions with code examples
