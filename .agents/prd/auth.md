# PRD — Server-Route Authentication via better-auth + Google OAuth

## Problem Statement

Memento is currently a fully client-side PWA: capture, inbox, and storage
live in the browser (localStorage, Web Speech). There is no way to gate
server-side functionality, so any `/api/*` endpoint that gets added is
either fully public or ad-hoc protected. As soon as we introduce features
that require a server (sync, LLM-backed processing, shared storage, usage
metering), we need a way to identify the caller and reject strangers
without compromising the offline, zero-friction capture experience that
defines the product.

The user needs an access control boundary that (a) protects server
endpoints, (b) leaves the Capture flow anonymous and offline-capable, and
(c) restricts sign-in to an explicit allowlist of known email addresses.

## Solution

Introduce better-auth with Google OAuth, backed by a Cloudflare D1
database (`memento-auth`) via the Drizzle adapter. An `EMAIL_ALLOWLIST`
env var controls who is allowed in; non-allowlisted accounts are rejected
at sign-in *and* on every subsequent request.

Server-route protection is **opt-in per route** via a `requireUser(event)`
helper. A small route-coverage test enforces deny-by-default: any
`/api/*` route that does not call `requireUser` must be listed
explicitly in `PUBLIC_API_ROUTES`, or CI fails.

The PWA remains fully client-side and prerendered. Auth state is shown
via a small chip absolutely-positioned inside the Capture pane (top-right
corner of the first snap section). There is no dedicated `/login` page;
rejection and success feedback are surfaced via the existing toast store,
triggered by query params set on the OAuth callback redirect.

## User Stories

1. As an operator, I want to restrict sign-in to a known list of email
   addresses, so that only people I trust can consume server resources.
2. As an operator, I want the allowlist to live in environment
   configuration (local `.env`, Cloudflare secrets in production), so
   that I can rotate it without code changes.
3. As an operator, I want to add a new `/api/*` endpoint and have it be
   protected by default, so that I cannot accidentally ship an open
   server endpoint.
4. As an operator, I want the existing `/api/debug-log` to remain
   publicly accessible, so that offline clients can still emit debug
   events without authenticating.
5. As a signed-out user on an allowlisted email, I want to sign in with
   Google in one click, so that I get access without creating a new
   password.
6. As a signed-out user, I want the Capture flow to work without signing
   in, so that I can offload thoughts with zero friction.
7. As a user on a non-allowlisted email, I want a clear rejection
   message after Google OAuth, so that I know the sign-in failed and
   why.
8. As a user whose email was just removed from the allowlist, I want my
   next request to a protected endpoint to fail, so that the allowlist
   is the authoritative source of access.
9. As a signed-in user, I want my session to survive being offline for
   weeks, so that I do not need to re-authenticate whenever I come back
   to the app.
10. As a signed-in user, I want to see a chip showing my account and a
    sign-out action, so that I can verify which identity is active and
    log out when needed.
11. As a signed-in user, I want sign-out to happen from inside the app
    without navigating to a separate page, so that the auth UI stays
    unobtrusive.
12. As a developer, I want the D1 schema to be generated from the
    better-auth config, so that the tables stay in lockstep with the
    library as it evolves.
13. As a developer, I want schema changes to produce incremental
    migration files, so that I can apply them to production D1 without
    rewriting the database.
14. As a developer, I want local development to use a local D1 stub
    seeded by the same migrations, so that dev and prod code paths are
    identical.
15. As a developer, I want the better-auth instance to be constructed
    lazily per-isolate using the request platform bindings, so that I
    do not leak the Cloudflare env into module scope.
16. As a developer, I want the allowlist parser to be a pure,
    independently-testable module, so that changes to its semantics do
    not require spinning up a full auth fixture.
17. As a developer, I want a route-coverage test that fails when a new
    `/api/*` route lacks `requireUser`, so that protection is enforced
    at review time.
18. As a reviewer, I want an ADR capturing why we chose better-auth
    over alternatives, why the app is not fully gated, and why
    protection is opt-in, so that future contributors do not undo these
    decisions without reading the rationale.
19. As a future implementer of offline-cached authentication, I want
    the session cookie to be long-lived (30 days sliding), `HttpOnly`,
    `Secure`, `SameSite=Lax`, so that a cached cookie can authenticate
    requests after the user returns from an offline period.
20. As a future implementer of service-worker-intercepted fetches, I
    want a documented invariant that SW replays must preserve
    credentials, so that the session cookie is not silently stripped.

## Implementation Decisions

### Scope
- Only server routes are gated. The PWA stays anonymous, root layout
  keeps `prerender = true`, and offline Capture is untouched.
- Auth is opt-in per `/api/*` route via `requireUser(event)`. A
  `PUBLIC_API_ROUTES` list names the exceptions (`/api/debug-log`,
  `/api/auth`).
- A route-coverage test enforces the above at CI time.

### Auth layer
- `better-auth` with the Google social provider.
- Session: 30-day expiry with 1-day sliding `updateAge`. Cookie
  attributes: `HttpOnly`, `Secure` in prod, `SameSite=Lax`, `Path=/`.
- Email allowlist enforced twice: (a) in
  `databaseHooks.user.create.before` so rejected accounts never get a
  user row, and (b) in `requireUser` so allowlist removals take effect
  on the next request without DB cleanup.
- OAuth callback errors (including allowlist rejection) redirect the
  browser to `/?auth_error=<reason>`. Successful sign-in redirects to
  `/` (or a caller-supplied `callbackURL`).

### Storage layer
- D1 binding `AUTH_DB` → database `memento-auth`
  (`579cb7c7-8396-4617-a2ec-d7e6fac7fa84`).
- Schema generated by `@better-auth/cli generate --adapter drizzle`
  into a Drizzle schema file. Not hand-edited.
- Migrations generated by `drizzle-kit generate` into `migrations/`,
  applied by `wrangler d1 migrations apply AUTH_DB --local|--remote`.
- No separate ORM for app tables yet; Entries remain in localStorage.

### Server plumbing
- `getAuth(platform)` — lazy per-isolate factory, reads the D1 binding
  from `platform.env.AUTH_DB` and string secrets from
  `$env/dynamic/private`. No module-scope env reads.
- `requireUser(event)` — the only server-side auth gate. Returns the
  authenticated `User`, re-checks the allowlist, throws `error(401)` on
  failure, and populates `event.locals.session` / `event.locals.user`
  as a side effect.
- `src/lib/server/**` placement is mandatory; SvelteKit's build-time
  enforcement prevents these modules from being imported by client
  code. Belt-and-braces rule: never return `locals.session` / `user`
  wholesale from a server load; cherry-pick primitive fields only.
- `src/routes/api/auth/[...all]/+server.ts` — thin better-auth handler
  shim for the whole OAuth flow.

### Client plumbing
- `src/lib/auth-client.ts` — wrapper around better-auth's
  `createAuthClient` for Svelte.
- `AuthChip.svelte` — absolutely-positioned chip inside the Capture
  pane's `<section>` (scrolls with the section; does not float over
  Inbox). Renders nothing until the first `useSession` fetch resolves
  (prevents flicker on the prerendered shell). Three states:
  `loading → no session → sign-in link` /
  `loading → session → avatar + popover with sign-out`.
- `+layout.svelte` reads `?auth_error=` / `?auth=` on mount, fires a
  toast via the existing `toast-store`, and strips the param with
  `history.replaceState` so reloads do not re-toast.

### Environment and secrets
- `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `EMAIL_ALLOWLIST` live in `.env` locally and in Cloudflare secrets in
  production. All four are read via `$env/dynamic/private`.
- D1 binding read via `event.platform.env.AUTH_DB` (typed in
  `App.Platform`).
- `.env.example` is updated to list `EMAIL_ALLOWLIST` (comma-separated,
  case-insensitive) and to drop the stale `DATABASE_URL` / Drizzle
  comment.

## Testing Decisions

Good tests here target **external behavior** — parser semantics,
route-coverage invariant, allowlist enforcement — not better-auth's
internals or the Google OAuth dance.

- **`allowlist` module (unit):** covers the parser and matcher.
  Empty input, single email, multiple, trailing commas, surrounding
  whitespace, mixed case, Unicode in the local part. This is the
  canonical deep-module test: pure inputs, pure outputs.
- **`auth-policy` module (unit):** covers `isPublicRoute(path)` —
  exact matches for `/api/debug-log`, prefix match for `/api/auth/...`,
  non-matches for anything else.
- **Route-coverage test (integration, file-system):** walks
  `src/routes/api/**/+server.ts` and asserts each file either imports
  `requireUser` from `$lib/server/auth` or matches
  `isPublicRoute(routePath)`. Adding a stub protected route without
  `requireUser` must fail the test.
- **`requireUser` — no direct unit test.** Its behavior is glue over
  better-auth and D1; a mock-heavy unit test would assert the mock,
  not the code. Exercised indirectly by the route-coverage test and by
  the manual E2E smoke.
- **`AuthChip` — no component test.** Too thin; verified by the
  manual E2E smoke.

Prior art: the `capture-policy` tests in
`src/lib/components/capture/` are the canonical pure-module pattern to
follow for `allowlist` and `auth-policy`.

**Manual E2E smoke (acceptance, not automated):**
1. Sign in with an allowlisted Google account → lands on `/`,
   chip shows signed-in state on reload.
2. Sign in with a non-allowlisted account → lands on
   `/?auth_error=not_allowlisted`, toast fires, no user row, no
   session cookie.
3. Hit a protected endpoint signed-out → 401; signed-in → 200.
4. Sign out from chip popover → chip flips back to "Sign in".
5. Capture flow and offline Capture still work unchanged.

## Out of Scope

- App-wide authentication (gating the whole PWA behind a one-time
  auth). This is explicitly called out as a **future** direction; the
  cookie and session settings chosen here are chosen to be compatible
  with that future without pre-building it.
- Service-worker-level credentialed fetch handling. Documented as a
  forward-looking invariant in `CONTEXT.md`; no SW changes in this
  work.
- Any ORM or migration tooling for Entries or other app tables.
  Drizzle is adopted here strictly as a schema/migration tool for
  better-auth's tables.
- Multi-provider auth. Google only.
- Account linking, password reset, email verification, magic links.
  Out of scope — Google OAuth is the only entry point.
- Admin UI for managing the allowlist. Env-var-driven only.
- Automated E2E tests for the OAuth flow. Manual smoke is sufficient
  given the size of the user population.

## Further Notes

- The allowlist policy has an operational subtlety worth documenting:
  removal takes effect on the next request, but the removed user's
  session row in D1 is not deleted. This is fine for the product
  (they cannot pass `requireUser`) and avoids a DB-cleanup side
  channel. If we later want true revocation we can add a cleanup
  pass, but it is not required for correctness.
- The future offline-cached-cookie direction is why we picked a
  30-day sliding session. A user who opens the app after two weeks
  offline still has a valid cookie; the next online request refreshes
  it.
- The decision to put the auth chip inside `CapturePane`'s section
  (rather than fixed to the viewport) is deliberate: Capture is the
  sacred path and its chrome should scroll away with it, not follow
  the user into Inbox. This matches the existing letterbox framing.
- An ADR (`docs/adr/0003-server-route-auth-via-better-auth.md`)
  captures the rationale, including why better-auth over Lucia/Auth.js,
  why opt-in protection over a blanket hook, and why no `/login`
  page.
