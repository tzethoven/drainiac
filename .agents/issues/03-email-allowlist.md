# Slice 3 — Email allowlist enforcement

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Restrict sign-in to the `EMAIL_ALLOWLIST` env var. Enforced at two
points:

1. **At account creation** — a better-auth
   `databaseHooks.user.create.before` hook rejects non-allowlisted
   emails. Rejected accounts never get a `user` row, never get a
   session cookie.
2. **On every request** — the eventual `requireUser` gate re-checks
   the allowlist (stub the re-check here; full `requireUser` lands in
   Slice 4). This means allowlist removals take effect on the next
   request without DB cleanup.

Rejections redirect the browser to `/?auth_error=not_allowlisted` so
Slice 5's toast has a real signal to consume.

## What to build — specifics

- `src/lib/server/allowlist.ts` — pure module:
  - `parseAllowlist(raw: string | undefined): Set<string>` — split on
    `,`, trim, lowercase, drop empties.
  - `isAllowed(email: string, allowlist: Set<string>): boolean` —
    lowercase-compare.
  - No I/O, no env reads, no better-auth imports.
- `src/lib/server/allowlist.test.ts` — unit tests (see Testing below).
- Wire the hook in `getAuth(platform)`:
  - Read `EMAIL_ALLOWLIST` from `$env/dynamic/private`, parse once per
    isolate (cache alongside the `getAuth` memoisation).
  - Reject in `databaseHooks.user.create.before` by throwing.
  - Configure better-auth's error URL / `onAPIError` to redirect to
    `/?auth_error=not_allowlisted`.

## Testing

- `allowlist.test.ts` covers:
  - empty / undefined input → empty set
  - single email
  - multiple emails
  - trailing/leading commas and whitespace
  - mixed case (both sides)
  - Unicode in local part
  - `isAllowed` negative case

Follow the pure-module pattern from `capture-policy.ts`:
inputs-in, outputs-out, no mocks.

## Acceptance criteria

- [ ] `allowlist.ts` has no imports from better-auth, D1, or
      `$env/*`. Purely functional.
- [ ] `allowlist.test.ts` passes; covers all cases above.
- [ ] Signing in with an allowlisted email succeeds (user row created,
      session cookie issued).
- [ ] Signing in with a non-allowlisted email:
  - [ ] Does NOT create a `user` row.
  - [ ] Does NOT issue a session cookie.
  - [ ] Redirects the browser to `/?auth_error=not_allowlisted`.
- [ ] Allowlist is case-insensitive and whitespace-tolerant end-to-end
      (verified with a test email that differs only in case/spacing).
- [ ] `EMAIL_ALLOWLIST` is added to `.env.example` with a format
      comment; stale `DATABASE_URL` / `# Drizzle` lines are removed.
- [ ] Capture flow unchanged.

## Blocked by

- Blocked by #2 (OAuth tracer bullet must be working).
