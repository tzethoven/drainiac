---
name: refactor
description: Scans a folder for code duplication and refactoring opportunities. Identifies duplicate logic that can be extracted into utility functions, shared components, rune-based modules, or other abstractions. Pass a folder path as argument, or 'feature' to review only the current feature branch diff.
argument-hint: [folder path | feature]
---

# Refactor Scanner

Scan the specified scope for duplicate code patterns and provide actionable refactoring recommendations.

**Do not automatically fix any issues.** Present all findings to the user and let them decide which ones to address.

## Scope

Determined by $ARGUMENTS:

- **Folder path** (e.g. `src/lib/components/capture`) — scan that folder only
- **`feature`** — scan only files changed in the current feature branch vs `staging`:
  ```bash
  git diff staging...HEAD --name-only   # changed files
  git diff staging...HEAD               # full diff
  ```
  For each changed file, also check the broader codebase for existing utilities or patterns that the new code may duplicate. Only report issues in new or modified code.

## What to Look For

- Duplicate logic that appears 2+ times with minimal variation
- Repeated UI patterns that could be shared components
- Similar rune-based state logic that could be consolidated
- Common utility operations that deserve dedicated functions
- Repeated type definitions or interfaces
- Hardcoded values that appear multiple times
- Similar validation schemas that could be composed

## Critical Rules

1. **Only report ACTUAL duplication** — code that appears 2+ times with minimal variation
2. **Threshold matters** — focus on meaningful duplication (5+ lines of similar logic), not one-liners or trivial similarities
3. **Consider context** — some duplication is intentional (e.g., separate validation schemas for different forms)
4. **Provide working code** — every recommendation must include a concrete code example
5. **Respect existing patterns** — match the codebase's current architecture and conventions
6. **Be pragmatic** — sometimes duplication is better than the wrong abstraction
7. **Never suggest splitting components under 100 lines** unless they clearly mix concerns
8. **Never extract one-time logic** — it must be reused to justify extraction

## Folder Type Detection

Adapt analysis focus based on the folder path:

### `/routes/**` (SvelteKit routing)
- Repeated page layouts or structure
- Duplicate data fetching patterns in load functions
- Similar loading/error states
- Repeated form action logic
- Similar API endpoint patterns in `+server.ts` files

### `/lib/components/**`
- Duplicate component logic or structure
- Repeated prop patterns suggesting a shared abstraction
- Similar styling patterns
- Common composition patterns
- Repeated snippets that could be shared

### `/lib/utils/**`
- Overlapping utility functions
- Similar helper logic that could be combined
- Repeated type guards or validators
- Common data transformations
- Duplicate rune-based state modules (`.svelte.ts`)

### `/lib/**` (general)
- Duplicate business logic
- Repeated validation logic
- Similar data transformations
- Rune-based state patterns that could be generalized

### `/routes/api/**` (API endpoints)
- Duplicate request validation
- Similar error handling
- Repeated response formatting
- Common middleware patterns

## Analysis Process

1. **Discover** — List all files in the target folder recursively. Check for existing utilities, shared components, or rune modules.
2. **Detect** — Read files and identify repeated patterns:
   - Similar function signatures
   - Repeated imports
   - Copy-pasted blocks
   - Similar component structures
   - Repeated type definitions
   - Duplicate rune-based state logic
   - Similar validation schemas
3. **Group** — Categorize findings:
   - Utility Functions
   - Shared Components
   - Rune-based State Modules (`.svelte.ts`)
   - Type Definitions
   - Constants/Config
   - Validation Schemas
   - Higher-Order Functions
4. **Prioritize** — Rank by impact:
   - 🔴 **High**: Repeated 3+ times, meaningful complexity, clear abstraction
   - 🟡 **Medium**: Repeated 2 times, moderate complexity, reasonable abstraction
   - 🔵 **Low**: Minor duplication, unclear benefit, or risky abstraction

## Output

Save results to `docs/refactoring-opportunities/[folder-name]-scan.md` using this format:

```markdown
# Refactoring Opportunities: [Folder Name]

**Scan Date:** YYYY-MM-DD
**Folder:** `/path/to/folder`
**Files Analyzed:** X files

## Summary

| Priority | Count |
|----------|-------|
| 🔴 High  | X     |
| 🟡 Medium| X     |
| 🔵 Low   | X     |

---

## 🔴 High Priority

### [Category]: [Brief Title]

**Pattern:** What's being repeated
**Occurrences:** X times across Y files
**Files:**
- `path/to/file1.ts` (lines X-Y)
- `path/to/file2.ts` (lines X-Y)

**Current Code:**
\```typescript
// Example of the duplication
\```

**Proposed Refactor:**
\```typescript
// The extracted abstraction
\```

**Usage After:**
\```typescript
// How files would use the new abstraction
\```

---

## 🟡 Medium Priority
(Same format)

## 🔵 Low Priority
(Same format)

## ✅ No Action Needed
Patterns found but intentionally duplicated, with explanation.
```

## Svelte 5-Specific Patterns to Look For

### Rune-based State Duplication
If multiple components have similar `$state`, `$derived`, or `$effect` logic, suggest extracting to a `.svelte.ts` module:

```typescript
// Before: Repeated in multiple components
let count = $state(0);
let doubled = $derived(count * 2);

// After: Extracted to counter.svelte.ts
export function createCounter(initial = 0) {
  let count = $state(initial);
  let doubled = $derived(count * 2);
  
  return {
    get count() { return count; },
    get doubled() { return doubled; },
    increment: () => count++,
  };
}
```

### Repeated Validation
If similar Zod schemas appear multiple times, suggest composition:

```typescript
// Before: Repeated
const UserSchema = z.object({ name: z.string(), email: z.string().email() });
const ProfileSchema = z.object({ name: z.string(), email: z.string().email(), bio: z.string() });

// After: Composed
const BaseUserSchema = z.object({ name: z.string(), email: z.string().email() });
const ProfileSchema = BaseUserSchema.extend({ bio: z.string() });
```

### Component Patterns
If similar component structures repeat, suggest a shared base or snippet:

```svelte
<!-- Before: Repeated structure -->
<div class="card">
  <h2>{title}</h2>
  <p>{content}</p>
</div>

<!-- After: Shared component -->
<Card {title}>{content}</Card>
```

## Self-Check Before Reporting

- [ ] Is this duplicated in 2+ places?
- [ ] Is the duplication at least 5+ lines of meaningful logic?
- [ ] Is my proposed abstraction simpler than the duplication?
- [ ] Have I provided complete, working code?
- [ ] Would I actually use this abstraction if I were maintaining this codebase?
- [ ] Does the abstraction follow Svelte 5 patterns (runes, not legacy syntax)?
