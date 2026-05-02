# Slice 1 — D1 binding + Drizzle schema + local migration

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Stand up the persistence layer for auth, end-to-end but without any
auth code yet. After this slice, `event.platform.env.AUTH_DB` is a
typed `D1Database`, the four better-auth tables exist in the local
D1 stub, and the migration workflow is reproducible.

No runtime auth behavior is added here. This slice is pure
infrastructure: a demoable "the DB is ready" milestone.

## Acceptance criteria

- [ ] `better-auth`, `drizzle-orm`, `drizzle-kit`, `@better-auth/cli`
      installed (runtime and dev deps split correctly).
- [ ] `wrangler.jsonc` includes a `d1_databases` block with
      `binding: "AUTH_DB"`, `database_name: "memento-auth"`,
      `database_id: "579cb7c7-8396-4617-a2ec-d7e6fac7fa84"`,
      `migrations_dir: "migrations"`.
- [ ] `app.d.ts` declares `App.Platform` with
      `env: { AUTH_DB: D1Database }` (and the usual `context` / `caches`).
- [ ] `app.d.ts` declares `App.Locals` with
      `session: Session | null` and `user: User | null`
      (populated lazily later; typed now).
- [ ] A minimal `src/lib/server/auth.ts` stub exists with a
      placeholder `getAuth(platform)` that constructs enough of a
      better-auth config for the CLI to introspect. Not wired into
      any route yet.
- [ ] `src/lib/server/db/schema.ts` is generated via
      `npx @better-auth/cli generate --adapter drizzle` and committed.
      Not hand-edited.
- [ ] `drizzle.config.ts` exists, points at the schema file, dialect
      `sqlite`, `out: "./migrations"`.
- [ ] `migrations/0000_*.sql` is generated via `drizzle-kit generate`
      and committed. Creates `user`, `session`, `account`,
      `verification` tables.
- [ ] `package.json` has `db:generate`, `db:migrate:local`,
      `db:migrate:remote` scripts.
- [ ] Running `npm run db:migrate:local` completes without error.
- [ ] `wrangler d1 execute AUTH_DB --local --command "SELECT name
      FROM sqlite_master WHERE type='table'"` lists all four tables
      plus the wrangler `d1_migrations` bookkeeping table.
- [ ] `npm run dev` still starts and `npm run build` still succeeds.
- [ ] The Capture flow in the app is visibly unaffected.

## Blocked by

None — can start immediately.
