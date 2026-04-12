# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types — use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## Svelte 5

- **Use runes for all reactivity** — `$state`, `$derived`, `$effect`, `$props`, `$bindable`
- **No legacy Svelte syntax**:
  - No `let` exports for props — use `$props()` instead
  - No reactive statements (`$:`) — use `$derived` and `$effect` runes
  - No `export let` bindings — use `$bindable()` in `$props()`
- **Component design**:
  - Keep components focused — one job per component
  - Extract reusable logic into `.svelte.ts` modules using runes
  - Use snippets (`{#snippet}` / `{@render}`) instead of slots for content projection
  - Props should be destructured from `$props()` with TypeScript types
- **Event handling**:
  - Use native DOM events (`onclick`, `oninput`) instead of `on:` directives
  - For custom events, use callback props
- **Stores (when needed)**:
  - Prefer runes over stores for component-local state
  - Use stores for cross-component shared state
  - Use `.svelte.ts` files for store definitions

### Example Component Patterns

```svelte
<script lang="ts">
  interface Props {
    title: string;
    count?: number;
    onIncrement?: () => void;
  }

  let { title, count = 0, onIncrement }: Props = $props();
  
  let doubled = $derived(count * 2);
  
  $effect(() => {
    console.log('Count changed:', count);
  });
</script>

<button onclick={onIncrement}>
  {title}: {count} (doubled: {doubled})
</button>
```

## SvelteKit

- **Routing**:
  - File-based routing in `src/routes/`
  - `+page.svelte` for pages
  - `+layout.svelte` for layouts
  - `+error.svelte` for error pages
  - Dynamic routes: `src/routes/[slug]/+page.svelte`
- **Data loading**:
  - `+page.ts` / `+page.server.ts` for data fetching via `load` functions
  - `+server.ts` for API endpoints (GET, POST, etc.)
  - Use `+page.server.ts` when you need server-only access (env vars, database, etc.)
- **Form handling**:
  - Use SvelteKit form actions for mutations (`+page.server.ts` actions)
  - Progressive enhancement with `use:enhance`
  - Return `{ success, data, error }` pattern from actions
- **Server hooks**:
  - `src/hooks.server.ts` for request interception (auth, logging, etc.)
  - `src/hooks.client.ts` for client-side initialization
- **Environment variables**:
  - Server-only: regular `env` variables accessed via `import { env } from '$env/dynamic/private'`
  - Public: `PUBLIC_` prefix, accessed via `import { env } from '$env/dynamic/public'`

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed
- No inline styles
- Light mode first, dark mode as option

Example v4 configuration in `app.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
  --font-sans: 'Geist Variable', system-ui, sans-serif;
}
```

## shadcn-svelte

- Use shadcn-svelte components as the base UI component library
- Customise via Tailwind classes and CSS variables
- Components live in `src/lib/components/ui/`
- Follow shadcn-svelte's Svelte 5 rune-based patterns

## File Organisation

- **Components**: `src/lib/components/[feature]/ComponentName.svelte`
- **UI primitives**: `src/lib/components/ui/`
- **Pages**: `src/routes/[route]/+page.svelte`
- **Layouts**: `src/routes/[route]/+layout.svelte`
- **API endpoints**: `src/routes/api/[route]/+server.ts`
- **Server-side logic**: `src/routes/[route]/+page.server.ts`
- **Types**: `src/lib/types/[feature].ts`
- **Utilities**: `src/lib/utils/[utility].ts`
- **Rune-based state modules**: `src/lib/utils/[module].svelte.ts`

## Naming

- **Component names**: PascalCase (`<ItemCard>`)
- **Component files**: PascalCase (`ItemCard.svelte`)
- **Non-component files**: kebab-case (`item-utils.ts`)
- **Rune modules**: kebab-case with `.svelte.ts` extension (`transcription-store.svelte.ts`)
- **Functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/Interfaces**: PascalCase (`interface ItemCardProps {}`)

## Database

- Use Drizzle ORM for all database operations (post-Phase 1)
- SQLite as the database engine
- localStorage for Phase 1 MVP

## Data Fetching

- Server-side data fetching via SvelteKit `load` functions
- Validate all inputs with Zod
- Client-side state via Svelte 5 runes
- Use `$derived` for computed values
- Use `$effect` for side effects and synchronization

## Error Handling

- Use try/catch in server-side logic
- Return `{ success, data, error }` pattern from form actions
- Display user-friendly error messages
- Use `+error.svelte` pages for route-level error boundaries

## Progressive Web App (PWA)

- Service worker in `src/service-worker.ts`
- Manifest configuration for installability
- Offline-first approach where possible
- Cache strategies for static assets

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
- Prefer composition over inheritance
- Extract repeated logic into utilities or reusable modules
