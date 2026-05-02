# Polish tracer — end-to-end happy path

## Parent

PRD: `.agents/prd/polish-captured-recordings.md` (TBD).

## What to build

The thinnest possible vertical slice that delivers a working
"long-press to polish" experience end-to-end. Schema and UI foundations
from slice #1 are in place; this slice wires the AI path through every
layer and makes the feature demoable on the happy path plus a single
generic failure fallback. Richer error handling and edit/revert
semantics come in slices #3 and #4.

### Server

1. **Prompt module.** Pure `buildPolishPrompt(category, rawTranscript)`
   returning `{ system, user, config }` where `config` pins
   `temperature: 0.2`, `maxOutputTokens: 1024`, and a JSON response
   schema `{ polished: string }`. One template with category-specific
   latitude interpolated:
   - `todo`: fix spelling/grammar only; keep wording and length as close
     to the original as possible.
   - `note`: fix spelling/grammar; light restructure for readability;
     no summarisation.
   - `idea`: fix spelling/grammar; may condense and rephrase to express
     the core in one or two clear sentences; never invent specifics.
   Hard rules shared across categories: preserve meaning; preserve
   language; preserve proper nouns/numbers/dates verbatim; no markdown,
   bullets, or emoji; output ideally shorter than input and never more
   than 1.2× input length; return unchanged if already clean or
   unintelligible. A `PROMPT_VERSION = 1` constant is exported.

2. **Gemini client.** Thin wrapper over `@google/genai` (or raw
   `fetch` to `generativelanguage.googleapis.com/v1beta` if the SDK
   misbehaves on Cloudflare Workers — smoke-test early). Reads
   `GEMINI_API_KEY` and `GEMINI_MODEL` from env. Interface:
   `polish({ rawTranscript, category }) → PolishResult`, where in this
   slice `PolishResult` is a narrow union: `{ ok: true; polishedText;
   model; promptVersion }` or `{ ok: false; reason: "upstream" }`.
   A 15-second `AbortController` timeout also maps to
   `{ ok: false; reason: "upstream" }` in this slice — the full error
   taxonomy lands in slice #4.

3. **Server route `POST /api/polish`.** Protected with
   `requireUser(event)` per ADR-0003. Validates body shape:
   `rawTranscript` is a non-empty string ≤ 4000 characters; `category`
   is `"todo" | "note" | "idea"`. Invalid input → HTTP 400 with
   `{ ok: false; reason: "bad-request" }`. Composes prompt module +
   Gemini client; returns `PolishResult` as JSON. No DB writes, no
   audit log. Route is automatically covered by the existing
   `route-coverage.test.ts` deny-by-default test.

4. **Environment.** Add `GEMINI_API_KEY` (required, secret) and
   `GEMINI_MODEL` (default `gemini-3.1-flash-lite-preview`) to `.env`.
   `.env.example` documents both, with a comment pointing to
   `gemini-2.5-flash-lite` as the stable fallback. Cloudflare
   production equivalents (`wrangler.jsonc` secrets / vars) added and
   documented in the PR.

### Client

5. **`entriesStore.polish(id)` + `isPolishing(id)`.** New reactive
   `polishingIds: Set<string>` lives in the store. Public API:
   - `polish(id)`: if `id ∈ polishingIds` **or** the entry already has
     `polishedText != null`, no-op. Otherwise add to set, snapshot the
     entry's `rawTranscript` and `category`, `fetch("/api/polish", …)`.
     On response: if `id` is still in the set, apply `{ polishedText,
     polishedAt: Date.now(), polishedModel, polishedPromptVersion }`
     via the existing update path and then remove from the set. If `id`
     was removed from the set while in flight (user edited or deleted
     the entry), silently discard the response. On network or
     non-`ok: true` response, remove from the set and surface a single
     generic toast — "Couldn't polish — try again." (Richer toasts in
     slice #4.)
   - `isPolishing(id)`: boolean derived from the set; reactive in
     Svelte 5 `$state` terms.
   - The store's existing `update(id, …)` and `remove(id)` methods
     both call `polishingIds.delete(id)` unconditionally. This is the
     single conflict detector.

6. **`EntryRow` long-press → polish.** The long-press handler
   introduced/retained in slice #1 now calls `store.polish(entry.id)`.
   The existing haptic/pulse feedback is reattached here (the gesture
   now does something worth confirming).

7. **Sparkles affordance.** Render a Lucide `Sparkles` icon at the row
   edge (same zone as the category badge) whenever
   `isPolishing(entry.id) === true` **or** `entry.polishedText != null`.
   While `isPolishing` is true the icon animates (spin or pulse); once
   the polish lands and `polishedText` is set, the icon settles to its
   static form at the same position. Failure → icon disappears and
   toast is shown; no row marker on failure.

8. **Accessibility.** `EntryRow`'s `aria-label` mentions the dual
   gesture: "long-press to polish, tap to edit."

### Not in this slice (slice #3)

- "Revert to original" button in `EditSheet`.
- Edit-save semantics that clear `polishedText` iff text differs from
  the current `polishedText`. (In this slice, saving an edit keeps the
  existing behaviour — whatever slice #1 left in place. If slice #1
  already seeds the input from `effectiveText(entry)`, a naive save
  will overwrite `displayText` with the polished value and leave
  `polishedText` set, which is temporarily inconsistent. Document this
  known gap in the PR; slice #3 fixes it immediately.)

### Not in this slice (slice #4)

- Distinguishing rate-limited / quota-exhausted / timeout / too-long /
  upstream in the response shape and in toasts.
- Client-side 4000-char pre-flight guard.
- Forwarding `Retry-After`.

## Acceptance criteria

- [ ] `buildPolishPrompt(category, rawTranscript)` returns a prompt
      that contains all shared hard rules and the correct per-category
      latitude block. `PROMPT_VERSION = 1` is exported.
- [ ] Gemini client calls the model named by `GEMINI_MODEL` with the
      constructed prompt and `responseMimeType: "application/json"`
      + schema; parses the JSON; returns a typed result. A 15 s
      `AbortController` timeout is in place.
- [ ] `POST /api/polish` requires auth (covered by
      `route-coverage.test.ts`), validates the body shape, and returns
      the `PolishResult` union as JSON. Invalid input → 400.
- [ ] `GEMINI_API_KEY` and `GEMINI_MODEL` are wired via `.env` locally
      and via Cloudflare secrets/vars in production.
      `.env.example` documents both with the stable fallback noted.
- [ ] `entriesStore.polish(id)` is the single entry point for triggering
      polish. `isPolishing(id)` is reactive. `update` and `remove` both
      clear `polishingIds` for the affected id.
- [ ] Long-press on an inbox row calls `store.polish(id)`. Haptic and
      visual pulse fire at gesture start.
- [ ] Long-press on a row where `isPolishing(id) === true` or
      `polishedText != null` is a no-op.
- [ ] Inbox row renders an animated Sparkles icon while polishing and a
      static Sparkles icon once `polishedText` is set. No row marker on
      failure.
- [ ] Polished entries render `effectiveText(entry)` (already wired in
      slice #1).
- [ ] Failure (network, non-`ok: true` response) produces a single
      generic toast and leaves the entry unchanged.
- [ ] Editing or deleting an entry while its polish is in flight
      discards the eventual response silently.
- [ ] `EntryRow` `aria-label` mentions the long-press-to-polish
      behaviour.
- [ ] Tests:
  - [ ] `buildPolishPrompt` — one snapshot-style assertion per category
        that the prompt contains the expected hard rules and category
        latitude. Purely text assertions, no mocking.
  - [ ] Gemini client — happy path with mocked `fetch` returning a
        valid JSON response; generic failure path with mocked `fetch`
        returning 500 and with an aborted request.
  - [ ] `entriesStore.polish()` — happy path writes the four polish
        fields; edit-during-flight discards the response;
        delete-during-flight discards the response; long-press while
        already polishing / already polished is a no-op. Mocks
        `fetch`. Extends `entries-store.test.ts` style.
- [ ] `npm run lint`, `npm run test`, and `npm run build` pass.
- [ ] Manual smoke test checklist included in the PR: capture a voice
      memo → long-press → see sparkle settle → `effectiveText` reflects
      the polished output → reload the app → state persists.

## Blocked by

- Blocked by #1 (foundation rewire)
