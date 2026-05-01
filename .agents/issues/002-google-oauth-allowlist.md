# 002 — Google OAuth + allowlist enforcement

## Parent

PRD: `.agents/prd/auth-access-gate.md`

## What to build

Wire Google as the only OAuth provider and enforce the email allowlist at the database-hook layer so that only allow-listed Google accounts ever receive a session. Non-allowed accounts are rejected with a generic, leak-free error. This slice lands OAuth and the allowlist together so there is never a deployed "open gate" state.

No app UI work in this slice — verification is via direct navigation to the better-auth sign-in URL and inspection of cookies + DB state.

## Type

HITL — requires the human to:
1. Configure the Google OAuth client in Google Cloud console with authorised redirect URIs for production origin and the Cloudflare tunnel dev origin.
2. Populate `ALLOWED_EMAILS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` in `.env` (dev) and via `wrangler secret` (prod).
3. Manually verify the allow / reject paths with a real Google account.

## Acceptance criteria

- [ ] `.env.example` updated with `ALLOWED_EMAILS`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` (with comments explaining format and fail-closed behaviour of `ALLOWED_EMAILS`).
- [ ] `auth-allowlist` module exports `isAllowed(email: string): boolean`. Parses `ALLOWED_EMAILS` once at module init into a `Set`. Normalises (trim + lowercase) on both sides of comparison. Fail-closed on empty or missing env var.
- [ ] Better-auth instance configured with Google provider, reading `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_SECRET` from `$env/dynamic/private`.
- [ ] `databaseHooks.user.create.before` throws / rejects if `isAllowed(email)` is false, preventing user-row creation for rejected first-time sign-ins.
- [ ] `databaseHooks.session.create.before` throws / rejects if `isAllowed(email)` is false, making revocation-via-env work for existing users.
- [ ] Both hooks delegate to the same `auth-allowlist` module — single source of truth.
- [ ] Rejection produces a redirect to `/?error=access_denied`. The thrown message is never echoed to the client.
- [ ] Allowed account: sign-in completes, user row exists, session cookie is set.
- [ ] Non-allowed account: sign-in fails, no user row is created, no session cookie is set, redirect to `/?error=access_denied` observed.
- [ ] Removing an already-signed-up user from `ALLOWED_EMAILS` and redeploying causes their next sign-in attempt to fail (session hook rejects).
- [ ] CONTEXT.md updated with invariants:
  - `ALLOWED_EMAILS` is the sole source of truth for access; empty/missing → deny all.
  - A valid session cookie proves current allowlist membership.
  - `auth-allowlist` is the single module consulted by both database hooks.
- [ ] `npm run build` succeeds; existing tests pass.

## Out of scope

- Unit tests for `auth-allowlist` (explicitly opted out by the owner).
- Marker cookie, LoginScreen, conditional render — those live in slice 003.
- Service worker changes — slice 004.

## Blocked by

- Slice 001 (D1 + better-auth skeleton)
