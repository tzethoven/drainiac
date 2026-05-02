# Slice 2 — Tracer-bullet OAuth end-to-end (no allowlist, no UI)

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Make the full Google OAuth loop work end-to-end against the D1 stub
from Slice 1. No email allowlist enforcement yet, no chip UI, no
`requireUser` gate. The milestone is: hit the sign-in URL manually,
complete Google OAuth, and observe a row in the `user` table and a
session cookie in the browser.

This is the tracer bullet that proves the plumbing is live.

## What to build — specifics

- `src/lib/server/auth.ts` exports `getAuth(platform)`: a lazy,
  per-isolate memoised factory that wires better-auth with:
  - Drizzle adapter over `platform.env.AUTH_DB`.
  - Google social provider (`GOOGLE_CLIENT_ID`,
    `GOOGLE_CLIENT_SECRET` via `$env/dynamic/private`).
  - `BETTER_AUTH_SECRET` via `$env/dynamic/private`.
  - Session `expiresIn: 60*60*24*30`, `updateAge: 60*60*24`.
  - Cookie `HttpOnly`, `Secure` (auto in prod), `SameSite=Lax`,
    `Path=/` (better-auth defaults — make them explicit for docs).
- `src/routes/api/auth/[...all]/+server.ts` — thin better-auth SvelteKit
  handler shim. Exports `GET` and `POST`.
- `baseURL` derived from `event.url.origin` (no hard-coded prod URL).

## Acceptance criteria

- [ ] `getAuth(platform)` is lazy and memoised per-isolate; no
      module-scope reads of `platform.env`.
- [ ] String secrets are read via `$env/dynamic/private`; the D1
      binding is read via `event.platform.env.AUTH_DB`.
- [ ] `/api/auth/[...all]/+server.ts` serves the full better-auth
      surface (`sign-in/social/google`, `callback/google`, `sign-out`,
      `get-session`).
- [ ] Manually navigating to
      `/api/auth/sign-in/social/google?callbackURL=/` redirects to
      Google, completes OAuth, and redirects back to `/`.
- [ ] After successful sign-in, a `better-auth.session_token` cookie
      is present with `HttpOnly`, `SameSite=Lax`.
- [ ] A row appears in the `user` table and the `account` table in the
      local D1 stub (verify with `wrangler d1 execute AUTH_DB --local`).
- [ ] `GET /api/auth/get-session` returns the session JSON when the
      cookie is present, and `null` when it is not.
- [ ] `POST /api/auth/sign-out` clears the session cookie.
- [ ] Any email can sign in at this stage — allowlist enforcement is
      explicitly NOT implemented in this slice.
- [ ] `npm run build` succeeds; no `$lib/server/*` import leaks into
      client code.
- [ ] Capture flow unchanged.

## Blocked by

- Blocked by #1 (D1 binding and schema must exist).
