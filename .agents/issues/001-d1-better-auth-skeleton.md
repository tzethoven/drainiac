# 001 — D1 + better-auth skeleton

## Parent

PRD: `.agents/prd/auth-access-gate.md`

## What to build

Stand up the database and auth plumbing end-to-end with no providers or UI yet. After this slice, the app has a working Cloudflare D1 database (local via Miniflare in dev, real in prod), a committed better-auth schema, applied migrations in both environments, and a catch-all auth route that returns an empty session. No Google OAuth, no allowlist, no UI changes.

This is the tracer bullet through the infrastructure layer: it proves the DB is wired, migrations flow cleanly dev→prod, and the SvelteKit ↔ better-auth ↔ D1 ↔ Drizzle chain holds together.

## Type

AFK

## Acceptance criteria

- [ ] `wrangler.jsonc` declares a `d1_databases` binding named `DB`.
- [ ] `better-auth`, `drizzle-orm`, `drizzle-kit`, `@better-auth/cli` installed with appropriate dev/prod split.
- [ ] Auth schema generated via `@better-auth/cli` and committed (user, session, account, verification tables).
- [ ] `drizzle.config.ts` configured for D1 + the generated schema.
- [ ] First migration generated via `drizzle-kit generate` and committed under `drizzle/`.
- [ ] Migration applies cleanly to local Miniflare D1 via `wrangler d1 migrations apply --local`.
- [ ] Migration applies cleanly to remote D1 via `wrangler d1 migrations apply`.
- [ ] `getDb(platform)` factory exists in server code, wrapping `platform.env.DB` with Drizzle. No module-level singleton.
- [ ] `/api/auth/[...all]/+server.ts` delegates to a minimal better-auth instance (no providers configured yet).
- [ ] `GET /api/auth/session` returns an empty/unauthenticated session (200 with null user, per better-auth defaults) in both dev and prod.
- [ ] SvelteKit Cloudflare adapter `platformProxy` is enabled so `platform.env.DB` is available during `vite dev`.
- [ ] `.wrangler/state/` is in `.gitignore`.
- [ ] Existing app functionality (capture, inbox, offline launch) is unchanged — no regression in current tests.
- [ ] `npm run build` succeeds; `npm run test` passes.

## Out of scope

- Google OAuth provider configuration.
- Allowlist logic (`auth-allowlist` module, database hooks).
- Marker cookie, LoginScreen, conditional render in the root layout.
- Service worker changes.
- CONTEXT.md invariants updates (those land with the slices that enforce them).

## Blocked by

None — can start immediately.
