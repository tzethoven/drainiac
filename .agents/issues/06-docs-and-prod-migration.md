# Slice 6 — Docs + production migration + E2E smoke (HITL)

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Close the loop: write down the decisions, apply the schema to
production D1, and run the manual E2E smoke with real Google
accounts. HITL because the prod migration is a one-way door and the
smoke requires a non-allowlisted Google account that only a human
can supply.

## What to build — specifics

### ADR

`docs/adr/0003-server-route-auth-via-better-auth.md`:

- **Context:** need to gate server-side functionality while keeping
  the PWA anonymous and offline-first.
- **Decision:** better-auth + Google OAuth + D1 via Drizzle adapter.
  Allowlist enforced at sign-in AND per-request. Route protection
  via opt-in `requireUser` + route-coverage test. No `/login` page;
  auth surfaced through a chip inside the Capture pane's section.
- **Consequences:** D1 is a new runtime dependency for protected
  routes. Capture stays client-only. Future app-wide
  (offline-cached) auth can layer on top without reshape.
- **Alternatives considered:**
  - Lucia / Auth.js — rejected: better-auth has cleaner D1 +
    allowlist hooks.
  - Gating the entire app — rejected: violates "Capture is sacred".
  - Blanket session population in `hooks.server.ts` — rejected:
    wastes D1 on public routes; opt-in is safer by virtue of the
    coverage test.
  - Dedicated `/login` page — rejected: chip + toast covers it with
    less surface.

### CONTEXT.md

Add a new "Auth" section to the glossary:

- **Allowlist** — the comma-separated `EMAIL_ALLOWLIST` env var;
  enforced at account creation AND at every `requireUser` call.
- **Session** — better-auth session; 30-day sliding; `HttpOnly`
  `SameSite=Lax` cookie.
- **Protected Route** — any `/api/*` that calls `requireUser(event)`.
  Routes not listed in `PUBLIC_API_ROUTES` MUST be protected
  (enforced by the route-coverage test).

Add invariants:

- Server-route protection is opt-in via `requireUser(event)`; the
  route-coverage test enforces deny-by-default.
- Never return `event.locals.user` / `event.locals.session` wholesale
  from a server load function — cherry-pick primitive fields only.
- Service worker `fetch` replays must preserve credentials
  (`credentials: 'include'`) so the session cookie survives SW
  interception. (Forward-looking; no SW changes in this work.)

### Production migration

- Run `npm run db:migrate:remote` to apply `migrations/0000_*.sql`
  to the `memento-auth` D1 database.
- Verify tables exist via
  `wrangler d1 execute AUTH_DB --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`.

### Manual E2E smoke

Run in production (or a preview deployment wired to the real Google
OAuth client):

1. Sign in with an allowlisted Google account → lands on `/` →
   chip shows signed-in state → reload → still signed in.
2. Sign in with a non-allowlisted Google account → lands on
   `/?auth_error=not_allowlisted` → toast fires → URL is cleaned →
   no user row in D1 → no session cookie.
3. Hit a protected endpoint signed-out (use a throwaway smoke
   endpoint OR use the next protected feature when it lands) → 401.
4. Hit the same endpoint signed-in → 200.
5. Sign out from the chip popover → chip flips back to "Sign in" →
   a subsequent protected request 401s.
6. Capture flow works online and offline; hold-to-record is not
   affected by the chip.

## Acceptance criteria

- [ ] `docs/adr/0003-server-route-auth-via-better-auth.md` exists
      and covers context, decision, consequences, alternatives.
- [ ] `CONTEXT.md` has the new Auth glossary section and the three
      new invariants.
- [ ] `npm run db:migrate:remote` has been run successfully; the
      four better-auth tables exist in the production D1.
- [ ] All six smoke steps above pass in production.
- [ ] Any throwaway smoke endpoint added during testing is removed
      before closing.

## Blocked by

- Blocked by #1 (schema must exist to migrate).
- Blocked by #4 (smoke step 3–4 require `requireUser` to be the gate).
- Blocked by #5 (smoke steps 1, 2, 5 involve the chip).
