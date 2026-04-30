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
  `createdAt`, `updatedAt`, optional `processedAt`, optional `warning`.
  `schemaVersion` is `1` today; bump it for any breaking shape change and
  write a migration.

- **Display Text** — the cleaned, user-facing form of an Entry's body.
  For voice: capitalised + trailing punctuation (see `cleanBody`). For
  text edits: literal after whitespace normalisation (see
  `normalizeEditText`). **These two paths are intentionally different.**

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

---

## When to update this file

- Before naming a new module or type that encodes a domain concept —
  add the term here first.
- When an invariant is enforced in code (a guard, an exhaustive switch,
  a test that exists to prevent a specific regression) — write it down
  here so the next reviewer knows it's load-bearing.
- When an ADR changes a definition — update the glossary entry and
  link the ADR.
