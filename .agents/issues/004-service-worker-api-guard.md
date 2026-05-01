# 004 — Service worker /api/* guard + offline verification

## Parent

PRD: `.agents/prd/auth-access-gate.md`

## What to build

Add a single early-return guard in `src/service-worker.ts` so that any request to `/api/*` bypasses the SW entirely — no cache read, no cache write. This keeps `/api/auth/session`, the OAuth callback (`/api/auth/callback/google?code=...`), sign-out, and any future server endpoint out of the SW's caching logic. Prevents stale-session bugs and prevents the navigation branch from intercepting the OAuth callback.

Verify end-to-end that the "authed once, then offline" contract from the PRD holds.

## Type

AFK

## Acceptance criteria

### Code

- [ ] `src/service-worker.ts` has a single early-return guard at the top of the `fetch` handler (before the navigation branch): if `url.pathname.startsWith("/api/")`, return without calling `event.respondWith`.
- [ ] A code comment explains why the guard matters — specifically that removing it would (a) allow stale `/api/auth/session` responses to be cached and (b) cause the OAuth callback to be intercepted as a navigation request and redirected to the cached `/` shell.
- [ ] No other changes to the SW: cache name, precache list, navigation branch, asset branch, and runtime cache branch are unchanged.
- [ ] `CACHE_NAME = memento-${version}` unchanged; deployment naturally bumps `version` and purges stale shell.

### Verification (manual smoke test documented in the PR)

- [ ] Offline-after-auth: sign in online → go offline (DevTools throttle) → hard reload → app renders from cache, login screen does not appear.
- [ ] OAuth callback works after SW install: sign out, clear session cookie, click "Sign in with Google" → redirect completes and lands on app (not intercepted into the cached shell).
- [ ] Sign-out actually clears: sign in → sign out online → reload → `LoginScreen` renders (no stale "authenticated" state served from cache).
- [ ] No regression to existing offline cold-launch behaviour for the capture + inbox flows.

### Docs

- [ ] CONTEXT.md updated with invariant:
  - The service worker never handles `/api/*` requests — those always reach the network (or fail with a browser network error when offline).

## Out of scope

- Reworking the existing cache strategy.
- Explicit offline UI for failed `/api/*` calls (the existing 503 fallback is fine).
- Any changes to auth logic, UI, or DB.

## Blocked by

- Slice 003 (Marker cookie + LoginScreen + conditional render)
