---
name: docs
description: Generate technical documentation for architecture or features. Use when asked to document a feature, generate architecture docs, or list existing documentation.
argument-hint: architecture|domain <name>|list
---

# Documentation Generator

Generate structured technical documentation by reading the actual codebase.

## Output Directory

All documentation goes to `docs/`

## Task

Execute: $ARGUMENTS

| Command | Description |
|---------|-------------|
| `architecture` | Generate full architecture doc covering stack, structure, data flow, auth, and deployment |
| `domain <name>` | Document a specific domain (e.g., `/skill:docs domain voice-capture`) |
| `list` | List all existing docs in `docs/` |

If no argument provided, explain the available commands above.

---

## Action: `architecture`

Generate `docs/architecture.md` covering:

1. **Overview** — What the app does, who it's for (pull from `context/project-overview.md`)
2. **Tech Stack** — Frameworks, libraries, databases, services (read `package.json`, config files)
3. **Project Structure** — Key directories and their purpose (read the actual file tree)
4. **Data Layer** — Database schemas, ORMs, how data flows (check for Drizzle schema, read localStorage patterns for Phase 1)
5. **Authentication** — Auth provider, flow, session handling (read `src/hooks.server.ts`, BetterAuth config when implemented)
6. **API & Server Logic** — How the frontend talks to the backend (scan `src/routes/` for `+server.ts` files and form actions)
7. **Key Patterns** — Reusable patterns like rune-based state, PWA service worker, data validation
8. **Deployment** — How the app is built and deployed (read `svelte.config.js`, check for adapter configuration)

### How to research

- Thoroughly scan the codebase for each section
- Read actual source files — do not guess or rely on project overview alone
- Include file paths as references (e.g., "defined in `src/lib/utils/auth.ts`")
- Note phase-specific behavior (Phase 1 vs future phases)
- Check `svelte.config.js` for adapter and build configuration
- Review `vite.config.ts` for build and dev server settings

---

## Action: `domain <name>`

Document a domain. **Before creating a new file**, check existing docs in `docs/domains/` — if the feature belongs to an existing domain, **update that file** instead of creating a standalone doc. Features are grouped by domain, not by implementation task.

### Existing domain docs (check before creating new ones)

| Doc | Domain | Currently covers |
|-----|--------|------------------|
| `voice-capture.md` | Voice input & transcription | Hold-to-record, Web Speech API, transcription storage |
| `pwa-setup.md` | Progressive Web App | Service worker, manifest, offline support |
| `appearance.md` | UI personalization | Light/dark mode, themes, visual customization |

### When to create a new file vs update an existing one

- **Update existing**: The feature adds a new operation, view, or flow to an already-documented domain (e.g., "save transcription to cloud" → update `voice-capture.md`)
- **Create new**: The feature introduces a genuinely new domain with its own route, data model, and user flow (e.g., "Habit Tracker", "Task Manager")

### What to cover

When writing new content (either in a new file or as a new section in an existing file):

1. **Purpose** — What problem this feature solves and for whom
2. **User Flow** — Step-by-step what the user does and sees
3. **Implementation** — Key files, components, server logic, and how they connect
4. **Data Model** — Relevant data structures, storage mechanism (localStorage, database)
5. **UI Components** — Component tree and notable UI patterns used
6. **State Management** — Rune-based state modules, stores, or other state patterns
7. **Edge Cases & Error Handling** — How errors and edge cases are handled
8. **Dependencies** — External services, APIs, or libraries this feature relies on (e.g., Web Speech API, service worker APIs)
9. **Tests** — Document any existing tests for this feature (unit, integration, e2e). Search for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, and `*.spec.tsx` files related to the feature. If no tests exist, state that explicitly.

When **updating an existing doc**, integrate the new content into the existing structure rather than appending a disconnected section. Update the file map, component tree, data model, and edge cases sections to include the new functionality. Avoid duplicating shared patterns that are already documented.

### How to research

- Search the codebase for files related to the feature name (routes, components, utilities, types)
- Read the actual implementation — trace from the route/page down through components to data layer
- Include file paths as references
- Check for `+page.svelte`, `+layout.svelte`, `+page.server.ts`, `+server.ts` files
- Look for rune-based state modules (`.svelte.ts` files)
- Check for validation schemas (Zod)
- If the feature has been documented in `context/current-feature.md` history, use that for additional context but always verify against current code
- Check for any existing test files related to the feature

---

## Action: `list`

List all files in `docs/` with their titles and last-modified dates.

Output format:
```
# Documentation Index

Last updated: YYYY-MM-DD

## Architecture
- `architecture.md` — [Title] (last modified: date)

## Domains
- `domains/voice-capture.md` — [Title] (last modified: date)
- `domains/pwa-setup.md` — [Title] (last modified: date)

## Refactoring
- `refactoring-opportunities/[name]-scan.md` — [Title] (last modified: date)
```

---

## Rules

- This skill produces DOCUMENTATION only — never modify source code
- Do NOT create branches or commits
- Always read actual source files — never fabricate code examples
- Only document what actually exists in the codebase — do not fabricate, recommend, or speculate
- Use code blocks for file paths, type definitions, and code snippets
- Keep language clear and direct — this is for internal developers, not marketing
- If a section has nothing meaningful to document, omit it rather than padding
- Use Mermaid diagrams where they clarify data flow or component relationships
- When updating existing docs, read the current version first and preserve any manual additions
- Use SvelteKit and Svelte 5 terminology (not React/Next.js terms)
