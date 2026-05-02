# Slice 5 — Auth chip UI + client SDK + query-param toast

## Parent

PRD: `.agents/prd/auth.md`

## What to build

Make auth state visible and actionable inside the app without a
dedicated `/login` page. A small chip sits absolutely-positioned
inside the Capture pane's `<section>` (top-right, scrolls away with
the section). The existing toast store surfaces OAuth success and
rejection via query params set by the callback redirect.

## What to build — specifics

- `src/lib/auth-client.ts` — thin wrapper over better-auth's
  `createAuthClient` (Svelte flavour). Exports a reactive
  `session` store (or `useSession()` hook, whichever the SDK
  version provides). Lives **outside** `$lib/server/`.
- `src/lib/components/auth/AuthChip.svelte`:
  - Uses `authClient.useSession()`.
  - Three render states:
    - **Loading** (before first `get-session` resolves): render
      nothing. No flicker on the prerendered shell.
    - **Signed out**: small "Sign in" chip linking to
      `/api/auth/sign-in/social/google?callbackURL=/`.
    - **Signed in**: avatar or initial, click opens a tiny popover
      showing email + a sign-out button (`POST /api/auth/sign-out`
      via the client SDK).
  - Styled with Tailwind; respects the existing design tokens.
- `src/routes/+page.svelte`:
  - First `<section>` becomes `position: relative`.
  - Mount `<AuthChip class="absolute top-2 right-2" />` as a sibling
    of `<CapturePane />`.
  - `CapturePane.svelte` is NOT modified (respects its invariant of
    owning gesture geometry only).
- `src/routes/+layout.svelte`:
  - On mount, read `?auth_error=` and `?auth=` from the URL.
  - Fire a toast via the existing `toast-store`:
    - `auth_error=not_allowlisted` → error toast
      "Your email is not on the allowlist." (or similar — keep short).
    - Other `auth_error` values → generic "Sign-in failed." toast.
    - `auth=signed_in` (optional) → success toast.
  - `history.replaceState` to strip the param so reloads do not
    re-toast.

## Acceptance criteria

- [ ] `auth-client.ts` has no imports from `$lib/server/*`.
- [ ] Signed-out user sees a "Sign in" chip at top-right of the
      Capture pane; scrolling down to Inbox scrolls the chip out of
      view with the section.
- [ ] Clicking "Sign in" initiates Google OAuth.
- [ ] After successful sign-in, the chip shows signed-in state on
      reload without a full-page flash (loading state renders
      nothing).
- [ ] The chip's popover shows the authenticated email and a
      working sign-out button.
- [ ] Sign-out flips the chip back to "Sign in" without a page
      reload.
- [ ] Non-allowlisted sign-in redirects to
      `/?auth_error=not_allowlisted`, fires an error toast, and the
      query param is cleared from the URL on next tick.
- [ ] The chip does not interfere with CapturePane's hold-to-record
      gesture (verified manually: holding anywhere on the pane still
      records; the chip is a small corner element).
- [ ] `prerender = true` on the root layout still holds.
- [ ] `CapturePane.svelte` is unchanged.
- [ ] Capture flow (including offline) is visibly unaffected.

## Blocked by

- Blocked by #3 (rejection toast needs the allowlist rejection path
  to redirect with the correct query param).

## Notes

- Deliberately NOT blocked by #4. The chip works regardless of
  `requireUser` — it only talks to better-auth's own public
  endpoints (`get-session`, `sign-in/social`, `sign-out`), which are
  in `PUBLIC_API_ROUTES`.
