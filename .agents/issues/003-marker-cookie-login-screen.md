# 003 — Marker cookie + LoginScreen + conditional render

## Parent

PRD: `.agents/prd/auth-access-gate.md`

## What to build

Turn the server-side gate from slice 002 into a user-facing flow. Server sets/clears a non-`httpOnly` `memento.authed` marker cookie in lockstep with the session cookie. A small reactive client module reads the marker synchronously on boot. The root layout conditionally renders either `LoginScreen` or the existing app tree based on that signal. Sign-out flips the UI back in place without a reload.

This is the tracer bullet through the user-facing flow: fresh visit → login, sign in → app, sign out → login, rejection → login + neutral banner. All synchronous, no network on the boot path.

## Type

AFK

## Acceptance criteria

### Server

- [ ] `memento.authed` marker cookie is set by the server whenever the session cookie is set (sign-in success). `httpOnly: false`, `secure` in prod, `sameSite=lax`, same expiry as the session cookie.
- [ ] `memento.authed` is cleared by the server whenever the session cookie is cleared (sign-out).
- [ ] Marker cookie contains no sensitive data — a bare `1` or the email (value choice documented in code; either is fine as long as the invariant holds).

### Client modules

- [ ] `auth-state` module: reactive `isAuthed` store backed by `document.cookie`. Cookie source is injectable (constructor takes an optional `cookieProvider` dep, mirroring how `entries-store` takes a `storage` dep). Exposes `signOut()` which calls the auth client, clears the cookie, and flips `isAuthed` to false.
- [ ] `auth-client` module: thin wrapper around better-auth's client exposing `signInWithGoogle()` (uses `callbackURL: "/"`) and `signOut()`.

### UI

- [ ] `LoginScreen.svelte` renders a single "Sign in with Google" button that calls `auth-client.signInWithGoogle()`.
- [ ] When `?error=access_denied` is present in the URL, `LoginScreen` renders a neutral banner: "Access denied. If you think this is a mistake, contact the owner." No mention of allowlist, no echo of attempted email.
- [ ] After reading `?error=`, the query param is stripped via `history.replaceState` so refreshes / shares don't persist it.
- [ ] `+layout.svelte` conditionally renders `<LoginScreen />` when `isAuthed` is false, and the existing app tree when true. Transition is reactive — sign-in success and sign-out both trigger correct re-render without a page reload.
- [ ] The app exposes a sign-out affordance (location: owner's choice — existing menu sheet or a new button; must be reachable by an authed user).

### Tests

- [ ] Unit tests for `auth-state`, prior-art styled after `toast-store.test.ts` / `entries-store.test.ts`:
  - Marker cookie present at init → `isAuthed` is true.
  - Marker cookie absent at init → `isAuthed` is false.
  - External cookie clearing (simulated via fake cookie provider) → `isAuthed` flips to false.
  - `signOut()` clears the marker and flips `isAuthed` to false without a reload.
  - Cookie source is injected; no real `document` required in tests.

### Docs

- [ ] CONTEXT.md updated with invariants:
  - The `memento.authed` marker cookie is a UX hint only; it is never consulted for any security decision.
  - Server endpoints always validate the real `httpOnly` session cookie independently.
  - The root layout's app-vs-login decision is synchronous and network-free.

### Smoke

- [ ] Fresh browser profile hitting the URL: sees `LoginScreen`.
- [ ] Sign in with allowed account: lands on app (no reload flicker, no navigation to `/login`).
- [ ] Sign out from within app: `LoginScreen` re-renders in place.
- [ ] Attempt sign-in with non-allowed account: lands on `/` with neutral banner visible.
- [ ] Refresh after successful sign-in: app renders immediately (no login flash).

## Out of scope

- A dedicated `/login` route (PRD explicitly says no).
- "Return to previous URL after sign-in" — always lands on `/`.
- Service worker changes — slice 004.
- Offline behaviour verification — slice 004.

## Blocked by

- Slice 002 (Google OAuth + allowlist)
