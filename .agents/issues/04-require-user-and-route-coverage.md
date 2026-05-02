# Slice 4 — `requireUser` + `auth-policy` + route-coverage test

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Introduce the single server-side auth gate (`requireUser`) and the
deny-by-default enforcement mechanism (a route-coverage test backed
by `PUBLIC_API_ROUTES`). After this slice, every `/api/*` route is
either (a) protected by `requireUser` or (b) explicitly listed as
public. CI fails otherwise.

## What to build — specifics

- `src/lib/server/auth-policy.ts`:
  - `PUBLIC_API_ROUTES: readonly string[]` — exact paths or path
    prefixes that are allowed to skip `requireUser`. Initial value:
    `['/api/debug-log', '/api/auth']`.
  - `isPublicRoute(path: string): boolean` — exact-match for leaf
    entries, prefix-match for entries treated as namespaces
    (`/api/auth` matches `/api/auth/callback/google` etc.).
  - Pure; no imports from better-auth or SvelteKit runtime.
- `src/lib/server/auth-policy.test.ts` — unit tests for
  `isPublicRoute`.
- `src/lib/server/auth.ts` gains `requireUser(event)`:
  - Calls `getAuth(event.platform).api.getSession({ headers: event.request.headers })`.
  - On missing session → `throw error(401, 'unauthenticated')`.
  - On session present but email no longer in allowlist →
    `throw error(401, 'not_allowlisted')`.
  - On success → populate `event.locals.session` / `event.locals.user`,
    return `user`.
- `src/routes/api/debug-log/+server.ts` stays untouched (public via
  `PUBLIC_API_ROUTES`; no `requireUser` added).
- `src/lib/server/route-coverage.test.ts` — vitest:
  - Walks `src/routes/api/**/+server.ts`.
  - For each file, derives the route path from its directory.
  - Asserts: the file contains a text/regex match for
    `requireUser` OR `isPublicRoute(routePath)` returns true.
  - Produces a clear failure message naming the offending route.

## Demonstration

As part of the slice work (not committed), add a throwaway
`src/routes/api/_smoke/+server.ts` that calls `requireUser`. Verify:

- Hitting it signed-out → 401.
- Hitting it signed-in with an allowlisted email → 200.
- Removing `requireUser` from the file → the coverage test fails.
- Removing the file and re-adding it without `requireUser` AND without
  listing it in `PUBLIC_API_ROUTES` → coverage test fails.

Remove the smoke route before merging.

## Acceptance criteria

- [ ] `auth-policy.ts` is pure; `auth-policy.test.ts` passes.
- [ ] `requireUser` throws `error(401)` on missing session.
- [ ] `requireUser` throws `error(401)` on allowlist removal (simulate
      by changing `EMAIL_ALLOWLIST` and replaying a request with an
      existing session cookie).
- [ ] `requireUser` populates `event.locals.user` and
      `event.locals.session` on success.
- [ ] `route-coverage.test.ts` passes against the current routes.
- [ ] A deliberately unprotected `/api/*` route (verified locally
      during development, not committed) makes the coverage test
      fail with a clear message.
- [ ] `/api/debug-log` remains publicly accessible.
- [ ] Capture flow unchanged.

## Blocked by

- Blocked by #3 (allowlist module is imported by `requireUser`).
