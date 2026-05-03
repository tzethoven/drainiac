# Memento — Domain Context

This file is the authoritative glossary and invariant list for Memento.
Use these terms exactly in code, comments, commits, and design discussion.
If a concept isn't here, add it here first, then use it in code.

For product vision and rationale, see `.agents/context/project-overview.md`.
For architectural decisions, see `docs/adr/`.

---

## Glossary

Terms marked **(planned)** describe the product vision but are not yet in
code. Don't invent types, tables, or seams for planned concepts until they
land; do use the agreed name when they do.

### Core flow

- **Capture** — the act of turning a raw thought into a stored Entry. The
  sacred path (see Design Principle #1). Two sources today: `voice` and
  `text`.

- **Capture Session** — one end-to-end attempt at a Capture: from the user
  starting input (pointer-down / opening the text composer) to a single
  terminal outcome. A session ends in **exactly one** outcome — either an
  Entry is created or it isn't, and at most one toast is shown.
  Modelled as a pure finite state machine in
  `src/lib/components/capture/capture-session.ts` (states: `idle`,
  `recording`, `saved-visible`, `denied`) with a Svelte adapter in
  `capture-session.svelte.ts`. `CapturePane` owns gesture geometry and
  rendering only; the adapter owns effect execution and controller
  subscription.

- **Capture Policy** — the pure mapping from
  `(CaptureEndReason, partialText)` to a `CapturePolicyResult`
  (`{ save: true; warning; toast } | { save: false; toast }`). Stateless,
  side-effect-free, exhaustive over `CaptureEndReason`. Lives in
  `src/lib/components/capture/capture-policy.ts`. Called from the session
  reducer on `holdRelease` and `pointerInterrupted`.

- **Capture End Reason** — the discriminated set of ways a Capture Session
  can terminate. Currently: `release`, `no-speech`, `network`,
  `audio-capture`, `aborted`, `unknown`, `permission-denied`. Adding a new
  reason is a policy change, not a bugfix — update the policy table and
  its tests in lockstep.

- **Partial Transcription** — transcript text that exists but was cut off
  by an error (`network`, `audio-capture`, `unknown`). The resulting
  Entry is saved with `warning: "partial-transcription"` so the review UI
  can flag it. `aborted` (tab switch, phone call) is **not** a partial —
  the user's thought was cut short, not the transcription.

### Data

- **Entry** — a captured thought, persisted. Fields: `id`, `schemaVersion`,
  `category`, `displayText`, `rawTranscript`, `source`, `done`,
  `createdAt`, `updatedAt`, optional `processedAt`, optional `warning`,
  and `polish` — a grouped `Polish | null` value holding the
  AI-polished metadata. `polish` is `null` when the entry has not been
  polished (or after a revert); when set it carries `{ text, at, model,
  promptVersion }`. Grouping the quartet makes the "set together,
  cleared together" invariant structural — no partial polish state is
  representable. `schemaVersion` is `3` today; bump it for any breaking
  shape change and write a migration step in
  `src/lib/stores/entries-migrations.ts`. Migration runs at store
  load and eagerly persists the upgraded array back to storage.

  Mutation happens through intent-named store operations, never a
  generic `update(patch)`: `editText(id, text)` commits a body edit
  (no-op on unchanged input; clears `polish` in one shot when the
  edit diverges from a polished entry); `setCategory(id, category)`
  and `toggleDone(id)` do not touch polish; `revertPolish(id)` clears
  `polish` while leaving `displayText` and `rawTranscript` intact so
  a re-polish remains available. Because no external caller can
  write `polish` directly, the "set together, cleared together"
  invariant is enforced at the seam rather than by convention.

- **Display Text** — the cleaned, user-facing form of an Entry's body.
  For voice: capitalised + trailing punctuation (see `cleanBody`). For
  text edits: literal after whitespace normalisation (see
  `normalizeEditText`). **These two paths are intentionally different.**
  User-facing surfaces never read `displayText` directly; they go
  through `effectiveText(entry)` so polished entries render their
  polished form instead.

- **Effective Text** — the single read site for "what string do we
  show the user?" Defined as `entry.polish?.text ?? entry.displayText`
  in `src/lib/utils/effective-text.ts`. Used by inbox rendering, the
  edit sheet seed value, and any future copy / share / search path.
  `rawTranscript` is never returned by `effectiveText` — it is the
  audit trail, not display.

- **Polished Text** — the AI-polished form of an Entry, produced by
  the "Polish with AI" action (long-press on an inbox row — **planned**;
  slice #1 lays the schema + UI foundation, slices #2–4 wire the
  behaviour). Lives on `entry.polish` as a grouped value object
  (`{ text, at, model, promptVersion }`) or `null` when the entry has
  not been polished or has been reverted. When set, `effectiveText`
  returns `entry.polish.text` in preference to `displayText`. The
  four fields move as one: they are always set together and cleared
  together (structural — a `Polish` value cannot exist with some of
  its fields absent). `at`, `model`, and `promptVersion` record when,
  with which model, and under which prompt version the polish was
  produced.

- **Raw Transcript** — the unmodified input as it arrived (Web Speech
  output, or the user's typed string before normalisation). Preserved
  on every Entry so we can re-derive `displayText` or audit the source.

- **Category** — the bucket an Entry lives in. Today: `todo | note | idea`.
  The set is closed in the type system; widening it is a schema change.

- **Code Word** / **Trigger** — a leading word in a voice capture that
  pins the Category explicitly, bypassing AI inference. Current triggers:
  `todo`, `to-do`, `to do`, `task` → `todo`; `note`, `notes` → `note`;
  `idea`, `ideas`, `id` → `idea`. Matching is case-insensitive and
  tolerates leading non-letter/digit noise from Web Speech. No trigger →
  Category defaults to `note`.

- **Inbox** — the review surface for unprocessed Entries. An Entry is
  "in the Inbox" while `processedAt` is unset.

### Auth

- **Allowlist** — the comma-separated `EMAIL_ALLOWLIST` env var. The
  authoritative source of who is allowed to sign in. Enforced at two
  points: `databaseHooks.user.create.before` (rejected accounts never
  get a `user` row) and `requireUser(event)` (re-checked on every
  protected request, so removing an email takes effect next call with
  no DB cleanup). Parser lives in `src/lib/server/allowlist.ts` and is
  pure — case-insensitive, whitespace-tolerant, empty input means no
  one is allowed.

- **Session** — a better-auth session. 30-day expiry with 1-day sliding
  `updateAge`. Cookie attributes: `HttpOnly`, `Secure` in prod,
  `SameSite=Lax`, `Path=/`. The long window is chosen to be compatible
  with a future offline-cached-cookie flow — a user returning after
  two weeks offline still authenticates on their next online request.

- **Protected Route** — any `/api/*` handler that calls
  `requireUser(event)` from `$lib/server/auth`. Routes that are NOT
  protected MUST be listed in `PUBLIC_API_ROUTES`
  (`src/lib/server/auth-policy.ts`); the route-coverage test fails CI
  otherwise. Currently public: `/api/debug-log` (dev log sink) and
  the `/api/auth` namespace (better-auth manages its own state).

- **AuthChip** — the top-right corner affordance inside the Capture
  pane's `<section>`. Three states: loading (renders nothing to
  prevent prerendered-shell flicker), signed-out (opens Google OAuth
  via the client SDK), signed-in (avatar + popover with email and
  sign-out). Lives at `src/lib/components/auth/AuthChip.svelte`.

- **CurrentUser** — the narrowed user shape exposed to route
  handlers and `load` functions: `{ id, email, name, image }`.
  Produced by `requireUser` from better-auth's `User`. The narrow
  shape *is* the contract — nothing outside `src/lib/server/auth.ts`
  should import better-auth's `User` type. See invariant 12.

- **authForEvent** — the single SvelteKit-aware seam between a
  `RequestEvent` and a configured better-auth instance. Reads the
  `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `EMAIL_ALLOWLIST` env vars and derives `baseURL` from
  `event.url.origin`. Every request-scoped caller (`requireUser`,
  the `/api/auth/[...all]` mount, future hooks) goes through it so
  adding a new auth secret is a one-file diff. Lives in
  `src/lib/server/auth.ts`.

### Planned

- **Bucket** *(planned)* — the top-level isolation boundary between
  `work` and `private`. Two buckets are fully isolated: no shared
  storage, no cross-bucket queries, separate auth contexts. Not yet
  modelled; do not add a `bucket` field to Entry speculatively — design
  it when the second bucket lands.

- **Content Session** *(planned)* — a user-nominated span during which
  captures are auto-tagged with a source (book, podcast, etc.). See
  project-overview. Distinct from **Capture Session**; don't conflate
  the names.

---

## Invariants

These are enforced today. Call them out in reviews if someone
"helpfully" unifies or weakens them.

### Text handling

1. **Edits are literal; only voice input is auto-capitalised and
   auto-punctuated.** `edit-text.ts` trims and collapses whitespace only.
   `transcript-parser.cleanBody` additionally capitalises the first
   character and appends `.` if no terminal punctuation. Do not unify
   these paths — the asymmetry is the feature.

2. **Raw input is preserved.** Every Entry stores `rawTranscript`
   alongside `displayText`. Cleaning is a view, not a replacement.

### Capture Session

3. **A Capture Session ends with exactly one outcome.** Enforced
   structurally by the session FSM: terminal transitions from
   `recording` are one-shot, and re-entering `recording` requires a
   new `holdStart`. If you find yourself needing to emit a second
   outcome, you need a new session, not a second call.

4. **The policy is exhaustive and pure.** `capturePolicy` switches over
   every `CaptureEndReason` with no default branch, takes only
   `(endReason, partialText)`, and has no side effects. Keep it that
   way — it is the one place the session's decision table lives, and
   its tests are the specification.

5. **`permission-denied` is sticky and silent.** No Entry, no toast;
   the pane flips to an explainer. It is the only end reason that
   changes pane state beyond the current session.

6. **`aborted` saves without a warning; transport errors save with
   one.** `network` / `audio-capture` / `unknown` + partial text →
   `warning: "partial-transcription"`. `aborted` + partial text →
   no warning. `release` never warns.

   **Slide-cancel and pointer-interrupted are distinct events, not
   unified.** Sliding up past the cancel threshold is the user saying
   "discard" — no save, no toast. `pointercancel` (OS interruption:
   phone call, tab switch) is an `aborted` end reason and runs the
   policy normally — save the partial, no warning. Collapsing these
   would weaken the UX contract.

### Triggers & categories

7. **Category is closed.** `Category = "todo" | "note" | "idea"` in
   the type system. Adding one touches: the union, the trigger map,
   the parser tests, the Inbox UI, and a schema-version bump if stored
   data needs backfill.

8. **Unknown trigger → `note`.** The parser never throws and never
   returns `null`; a capture with no recognisable trigger becomes a
   `note` with the full raw text as body.

### Storage

9. **Entries are newest-first in the store.** `add` prepends. UI code
   may assume `entries[0]` is the most recent.

10. **`schemaVersion` bumps require a migration.** Don't silently
    reshape persisted entries; write the migration in
    `entries-store` and a test that loads the old shape.

### Auth

11. **Server-route protection is opt-in via `requireUser(event)`.**
    Every `/api/*` route either calls `requireUser` or is listed in
    `PUBLIC_API_ROUTES`. Enforced by
    `src/lib/server/route-coverage.test.ts`, which walks the route
    tree and fails CI on any unprotected, unlisted route. Adding a
    new public route is a deliberate act: add the path to
    `PUBLIC_API_ROUTES` and explain why in the PR.

12. **`event.locals.user` is a narrowed `CurrentUser`, not the full
    better-auth `User`.** `requireUser` projects the better-auth user
    down to `{ id, email, name, image }` before writing to locals and
    returning. This is the structural form of the old "never return
    `locals.user` wholesale" rule: with the narrow shape there is
    nothing dangerous to leak, so server `load` functions may return
    `locals.user` directly. Widening `CurrentUser` is a deliberate
    act — audit whether the new field is safe to send to the client.
    `event.locals.session` is deliberately not populated; nothing
    outside the auth gate needs it and keeping it off `locals`
    removes a foot-gun.

13. **Service-worker `fetch` replays must preserve credentials.**
    Any SW that intercepts requests and re-issues them MUST use
    `credentials: 'include'` (or equivalent) so the session cookie
    survives interception. Forward-looking — no SW changes today —
    but documented here because it is load-bearing for the future
    offline-cached-cookie flow and easy to get wrong silently.

---

## When to update this file

- Before naming a new module or type that encodes a domain concept —
  add the term here first.
- When an invariant is enforced in code (a guard, an exhaustive switch,
  a test that exists to prevent a specific regression) — write it down
  here so the next reviewer knows it's load-bearing.
- When an ADR changes a definition — update the glossary entry and
  link the ADR.
