# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types — use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## Svelte 5

- Use runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`) for all reactivity
- No legacy `let` exports for props — use `$props()` instead
- No legacy reactive statements (`$:`) — use `$derived` and `$effect`
- Keep components focused — one job per component
- Extract reusable logic into `.svelte.ts` modules using runes
- Use snippets (`{#snippet}` / `{@render}`) instead of slots

## SvelteKit

- File-based routing in `src/routes/`
- Use `+page.svelte` for pages, `+layout.svelte` for layouts
- Use `+page.server.ts` / `+server.ts` for server-side logic
- Use form actions for form submissions and mutations
- Use load functions (`+page.ts` / `+page.server.ts`) for data fetching
- Dynamic routes: `src/routes/[param]/+page.svelte`

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed
- No inline styles
- Light mode first, dark mode as option

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## shadcn-svelte

- Use shadcn-svelte components as the base UI component library
- Customise via Tailwind classes and CSS variables
- Components live in `src/lib/components/ui/`

## File Organisation

- Components: `src/lib/components/[feature]/ComponentName.svelte`
- UI primitives: `src/lib/components/ui/`
- Pages: `src/routes/[route]/+page.svelte`
- Server logic: `src/routes/[route]/+page.server.ts`
- Types: `src/lib/types/[feature].ts`
- Utilities: `src/lib/utils/[utility].ts`

## Naming

- Component names: PascalCase (`<ItemCard>`)
- Component files: PascalCase (`ItemCard.svelte`)
- Non-component files: kebab-case (`item-utils.ts`)
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (`interface ItemCardProps {}`)

## Database

- Use Drizzle ORM for all database operations
- SQLite as the database engine
- localStorage for Phase 1

## Data Fetching

- Server-side data fetching via SvelteKit load functions
- Validate all inputs with Zod
- Client-side state via Svelte 5 runes

## Error Handling

- Use try/catch in server-side logic
- Return `{ success, data, error }` pattern from form actions
- Display user-friendly error messages

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
