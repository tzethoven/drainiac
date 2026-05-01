# PRD — Authentication & Access Gate

## Problem Statement

Memento is deployed to a publicly-reachable URL. Anyone who discovers the URL can load the app, use its server endpoints, and — once server-side features like AI processing or sync land — consume resources the owner is paying for. The owner wants to control **who** can access the app without adding friction for themselves or invited users.

Secondary problem: the app is local-first and offline-capable. Any access-control mechanism must not break the existing "open the PWA offline and capture a thought" contract once a user has been approved once.

## Solution

A server-enforced allowlist gate fronted by Google OAuth via better-auth.

- The owner maintains a comma-separated list of allowed email addresses in an env var.
- Visitors land on a login screen with a single "Sign in with Google" button.
- Only allow-listed Google accounts receive a session. Everyone else is rejected with a neutral "access denied" message.
- Once signed in, a device remains usable — including offline — for the lifetime of the session cookie (better-auth default: 7 days rolling). Going offline for longer than that requires re-signing-in when next online.
- The app's local-first data model is unchanged: entries stay on the device in localStorage, never on any server.
- Sign-out is an explicit user action that clears both cookies and flips the UI back to the login screen without a page reload.

## User Stories

1. As the owner, I want to restrict access to my hosted Memento instance to a list of email addresses I control, so that strangers who stumble on the URL cannot use the app.
2. As the owner, I want to add or remove allowed users by editing an env var and redeploying, so that I never need to build or maintain an admin UI.
3. As the owner, I want the allowlist to fail closed if misconfigured (empty or missing), so that a deployment mistake never silently opens the gate.
4. As the owner, I want rejected sign-in attempts to see a generic "access denied" message, so that the allowlist's shape and members are not leaked to probing visitors.
5. As the owner, I want rejected sign-in attempts to leave no trace in the user table, so that the database stays clean and orphan rows don't accumulate from bots.
6. As the owner, I want to revoke a previously-allowed user by removing their email and redeploying, so that their next sign-in attempt fails even though they signed in successfully in the past.
7. As the owner, I want the access gate to live on the server endpoints rather than on the static shell, so that the existing prerender + service-worker offline launch keeps working unchanged.
8. As an invited user, I want to sign in with my Google account in one click, so that I don't have to create yet another password.
9. As an invited user, I want to stay signed in across browser restarts and app reopens, so that I'm not asked to re-authenticate on every visit.
10. As an invited user, I want the app to open and work offline after my first sign-in, so that I can capture thoughts when I have no network.
11. As an invited user on a cold offline boot after signing in earlier, I want the app UI to appear immediately, so that I do not see a blocked login screen when I know I'm already authorised.
12. As an invited user, I want to sign out from within the app, so that I can hand the device to someone else without exposing my authorised session.
13. As an invited user who has signed out, I want to land back on the login screen without a page reload or jarring navigation, so that the sign-out feels native to the app.
14. As an invited user whose access has been revoked while offline, I want to keep working on what I had locally and be cleanly kicked out on the next online server interaction, so that I understand the state change but don't lose unsynced work (there is none, by design).
15. As an invited user, I want the login screen to be the first thing I see when I haven't signed in, so that I'm not confused by a partially-working app shell.
16. As a stranger who loads the URL, I want to see only a login screen, so that I understand this app is not for me.
17. As a stranger who attempts Google sign-in with a non-allowed account, I want to see a neutral rejection, so that I know I'm blocked without learning anything about the allowlist.
18. As a developer, I want the same database driver and dialect used in dev and prod, so that I never debug an issue that only reproduces in one environment.
19. As a developer, I want the dev database to be auto-created locally by the existing tooling, so that a fresh clone + `npm run dev` just works.
20. As a developer, I want schema changes to flow through versioned migration files checked into git, so that dev and prod stay in sync and changes are reviewable.
21. As a developer, I want the auth database to be entirely separate from the app's local entry storage, so that the local-first invariants of Memento's capture flow are untouched.
22. As a developer, I want the service worker to never cache auth endpoints or OAuth callbacks, so that stale responses cannot desync the client from the server's view of the session.
23. As a developer, I want the client's "app vs login" boot decision to be synchronous and network-free, so that cold starts stay fast online and functional offline.
24. As a developer, I want the client-side marker that says "this device has been approved" to carry zero security weight, so that a compromised or stale marker cannot grant access — the server always validates the real session cookie.
25. As a developer, I want a single source of truth for access control (one allowlist module consulted by both database hooks), so that there is no way for the two sign-in paths to disagree.
26. As a reviewer, I want the access-control invariants documented in CONTEXT.md, so that future refactors don't accidentally weaken the gate.

## Implementation Decisions

### Gate location

- The prerendered shell stays public. Access control lives on server endpoints, enforced by better-auth hooks that refuse to create sessions for non-allow-listed accounts.
- A valid session cookie therefore proves current allowlist membership — "authenticated" and "authorised" are collapsed into a single check everywhere downstream.
- The root layout retains `prerender = true`. No server hook gates the shell itself. API routes (`+server.ts` files) are naturally dynamic and handle their own auth.

### Allowlist

- Single env var `ALLOWED_EMAILS`, comma-separated, case-insensitive, whitespace-tolerant.
- Empty or missing → rejects everyone (fail-closed). This is a hard invariant.
- Parsed once at module init into a `Set`. Changing the allowlist requires redeploy/restart.
- Enforced in **both** better-auth `databaseHooks.user.create.before` (keeps user table clean of rejected first-time attempts) and `databaseHooks.session.create.before` (makes revocation work for existing users).
- Rejection surfaces as a redirect to `/?error=access_denied`. The login screen reads the query param, renders a neutral banner, and strips the param via `history.replaceState`. No leakage of allowlist contents or the attempted email.

### Session & client boot

- Better-auth defaults: 7-day rolling session cookie, `httpOnly`, `secure`, `sameSite=lax`.
- A non-`httpOnly` **marker cookie** `memento.authed` is set and cleared by the server in lockstep with the session cookie. It carries no security weight — its sole purpose is to let the client synchronously choose "render app" vs. "render login" on boot without a network call.
- **Invariant:** the marker cookie is never consulted for any security decision. Server endpoints always validate the real `httpOnly` session cookie independently.
- Offline boots that were signed in within the last 7 days work transparently because the marker cookie is read locally. Offline boots after >7d show the login screen with a "connect to sign in" message — accepted trade-off.

### UI structure

- No dedicated `/login` route. The root `+layout.svelte` conditionally renders either `<LoginScreen />` or the existing app tree based on the marker cookie.
- OAuth callback always redirects to `/`.
- Sign-out re-renders `<LoginScreen />` in place with no navigation or reload.
- `LoginScreen` is a single "Sign in with Google" button plus the rejection banner when `?error=access_denied` is present.

### Database & persistence

- **Cloudflare D1** for both dev and prod, via `drizzle-orm/d1`.
  - Prod: a D1 database bound as `DB` in `wrangler.jsonc`.
  - Dev: Miniflare's local D1 emulation, auto-created by SvelteKit's Cloudflare adapter `platformProxy` during `vite dev`.
  - One driver, one dialect, one migration path across both environments.
- No Turso, no libsql, no `better-sqlite3`, no `DATABASE_URL`.
- Schema generated via `@better-auth/cli` (user, session, account, verification tables). Generated file committed; regeneration is the update path.
- Migrations authored with `drizzle-kit generate` and applied via `wrangler d1 migrations apply`. **No `drizzle-kit push`** in any environment.
- The `db` instance is **not** a module-level singleton. A factory `getDb(platform)` wraps `platform.env.DB` per request. Better-auth is configured to receive this per-request DB, matching the Workers execution model.
- Memento's existing entry storage (localStorage, `entries-store`) is untouched. The auth DB is auth-only.

### Service worker

- Single early-return guard at the top of the `fetch` handler: any URL starting with `/api/` is not handled by the SW — the browser makes the request normally, no cache read, no cache write. This covers `/api/auth/session`, `/api/auth/callback/google`, `/api/auth/sign-out`, and any future server endpoint.
- Comment in code explains *why* the guard matters, so future refactors don't silently remove it.
- Existing cache versioning (`memento-${version}`) is unchanged; SvelteKit bumps `version` per build automatically, purging stale shells on activate.

### Modules (deep-to-shallow)

- **`auth-allowlist`** — pure module exposing `isAllowed(email): boolean`. Env parsed once at init; normalisation and fail-closed logic internal. Consumed by both database hooks. This is the single security-critical unit.
- **`auth-state` (client)** — encapsulates reading the marker cookie, exposing a reactive `isAuthed` store for the root layout, and reacting to `signOut()`. Cookie source is injectable.
- **`auth` (server)** — better-auth instance factory: Google provider, Drizzle + D1 adapter, both database hooks wired to `auth-allowlist`, marker-cookie set/clear on session create/destroy.
- **`db` (server)** — `getDb(platform)` factory wrapping `platform.env.DB` with Drizzle.
- **`auth-client`** — thin wrapper around better-auth's client: `signInWithGoogle()`, `signOut()`.
- **`LoginScreen.svelte`** — the single-button login UI plus rejection banner.
- **`hooks.server.ts`** — new; delegates to better-auth's request handler.
- **`+layout.svelte`** — modified to conditionally render `<LoginScreen />` or the app based on `auth-state`.
- **`service-worker.ts`** — modified with the one `/api/*` guard.

### Invariants to add to CONTEXT.md when this lands

- `ALLOWED_EMAILS` is the sole source of truth for access. Empty or missing → no one signs in.
- A valid session cookie proves current allowlist membership; "authenticated" and "authorised" are the same check.
- The `memento.authed` marker cookie is a UX hint only — never consulted for security.
- The service worker never handles `/api/*` requests.

## Testing Decisions

Tests should assert externally observable behaviour (outputs, rendered state, cookie state) rather than implementation details (which hook fired, what the internal Set looks like). Prior art: `capture-policy.test.ts` for pure table-driven tests, `toast-store.test.ts` and `entries-store.test.ts` for reactive stores with dependency injection.

**Module to test:**

- **`auth-state`** — unit tests covering:
  - Marker cookie present on init → `isAuthed` is true.
  - Marker cookie absent on init → `isAuthed` is false.
  - Cookie cleared (simulated) → `isAuthed` flips to false.
  - `signOut()` clears the marker and flips `isAuthed` to false without a reload.
  - Cookie source is injected via a fake document/cookie provider in the test, mirroring how `entries-store` accepts a storage dependency.

**Explicitly not unit-tested** (covered by manual smoke tests after implementation):

- `auth-allowlist` — the owner has opted out of tests for this module.
- Better-auth itself: Google OAuth flow, session cookie issuance, hook firing order.
- Drizzle + D1 queries.
- SvelteKit hooks plumbing.
- Service worker behaviour (verified via offline smoke test: sign in, go offline, reload — shell renders; sign out while online — login screen renders without reload).

## Out of Scope

- Multi-user isolation or shared state of any kind. Each allowed user signs in to their own device and sees their own local entries; there is no server-side per-user data.
- Multi-device sync of entries. Entries remain in `localStorage` on the device that created them.
- The `work` vs `private` bucket split mentioned in CONTEXT.md as "planned". Separate auth contexts per bucket are a future concern.
- Role-based access control, admin UIs, invitation flows, email-link magic-login, passkey/WebAuthn, or any auth method beyond Google OAuth.
- Rate limiting, brute-force protection, or account lockout. Google handles the credential side; the allowlist is the policy layer.
- Cross-device logout ("sign out everywhere") or server-side session enumeration UIs.
- A dedicated `/login` URL route, "return to where you were" redirect plumbing, or deep-link preservation through the OAuth flow.
- Migrating off Cloudflare. D1 couples the auth DB to Workers; re-platforming is explicitly a future problem if it ever happens.
- Rotating `BETTER_AUTH_SECRET` or `ALLOWED_EMAILS` without a redeploy.
- Any change to Memento's capture flow, entry schema, service worker precache list, or prerender strategy beyond the single `/api/*` SW guard.

## Further Notes

- **Cloudflare coupling is deliberate.** The app already uses `@sveltejs/adapter-cloudflare` and a Cloudflare tunnel. Choosing D1 over Turso adds zero new vendor dependency and removes an external service + credential. The portability cost is acknowledged and accepted.
- **Threat model reminder.** The goal is gating a public URL against strangers. The goal is *not* protecting data on a shared device — Memento's data is local, so device possession already implies data access. Auth is an access-control layer for server features (OAuth endpoints today, AI / sync tomorrow), not a lock on the entries themselves.
- **OAuth "fail-closed" applies to a specific failure mode.** An empty `ALLOWED_EMAILS` rejects everyone. This is correct because the allowlist is the only access policy; an absent policy must mean "deny all", not "allow all".
- **The marker-cookie design only works because better-auth sets `httpOnly` on the real session cookie.** If that ever changes, the marker cookie becomes redundant (and slightly confusing). Worth re-checking on any better-auth major version bump.
- **Miniflare's local D1 lives under `.wrangler/state/`.** That directory should be in `.gitignore` (confirm when implementing) so local databases don't leak into commits.
- **Google OAuth client configuration.** The OAuth client's authorised redirect URI must include both the production origin and any dev origin (e.g. the Cloudflare tunnel hostname used by `npm run dev:tunnel`). Owner to manage in the Google Cloud console; not a code concern.
- **Future extension path to per-bucket auth** (the CONTEXT.md "planned" item): the current design leaves room to add a bucket claim into the session on sign-in without touching the allowlist module or the marker-cookie contract. Not building it now.
