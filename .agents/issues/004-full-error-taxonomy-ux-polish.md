# Full error taxonomy + UX polish

## Parent

PRD: `.agents/prd/polish-captured-recordings.md` (TBD).

## What to build

Slice #2 shipped polish with a single generic "Couldn't polish — try
again" toast covering every non-happy-path outcome. This slice teaches
the server to classify Gemini failures precisely and teaches the client
to show the user the right message. It also adds the input-length
guard on both sides so oversized transcripts fail fast and cheaply.

This slice can be worked in parallel with slice #3 — they touch
different modules.

### Server

1. **Expanded response taxonomy.** `PolishResult` becomes the full
   discriminated union:
   ```
     | { ok: true; polishedText; model; promptVersion }
     | { ok: false; reason: "too-long" }
     | { ok: false; reason: "bad-request" }
     | { ok: false; reason: "rate-limited"; retryAfterMs?: number }
     | { ok: false; reason: "quota-exhausted" }
     | { ok: false; reason: "timeout" }
     | { ok: false; reason: "upstream"; status: number }
   ```
   HTTP status mapping: `200` for ok; `400` for `too-long` /
   `bad-request`; `429` for `rate-limited` and `quota-exhausted` (with
   `Retry-After` header forwarded verbatim from Gemini when available);
   `504` for `timeout`; `502` for `upstream`. Body always matches the
   union.

2. **Gemini-error classification.** The Gemini client inspects the
   upstream error body to distinguish per-minute rate limiting from
   per-day quota exhaustion. Google's error payloads include
   `quotaMetric` / `quotaId` hints containing substrings like
   `PerMinute` vs `PerDay`; match on those. When a 429 cannot be
   confidently classified, default to `rate-limited`. Network errors
   and non-429 5xx map to `upstream`. The 15 s `AbortController`
   firing maps to `timeout` (was `upstream` in slice #2).

3. **Server-side length guard.** The route rejects `rawTranscript`
   longer than 4000 characters with `{ ok: false; reason: "too-long" }`
   and HTTP 400 **before** calling Gemini. Empty / non-string bodies
   remain `bad-request`.

4. **No retries.** Server makes one attempt per request. No backoff,
   no queue. Documented in a code comment referencing this decision.

### Client

5. **Toast map in `entriesStore.polish`.** The generic toast from
   slice #2 is replaced with a `reason → message` map:
   - `rate-limited` → "Too fast — try again in a sec."
   - `quota-exhausted` → "Polish quota used up for today."
   - `timeout` → "Polish timed out. Try again?"
   - `too-long` / `bad-request` → "Too long to polish."
   - `upstream` / network failure → "Couldn't polish — try again."
   Copy lives in one place (a constant map in the store or an adjacent
   pure module) to keep it greppable and easy to tune.

6. **Client-side 4000-char pre-flight guard.** Before firing the
   fetch, `store.polish(id)` checks `entry.rawTranscript.length`. If
   over 4000, skip the network round-trip entirely and surface the
   `too-long` toast directly. Still remove the id from `polishingIds`
   cleanly. The server guard remains authoritative; the client guard
   is a cheap UX win.

7. **`Retry-After` parsing (minimal).** When the response carries
   `retryAfterMs`, the client still shows the generic rate-limit toast
   in this slice — we're not building a countdown UI yet. Storing it
   in the response shape keeps the future-seam open without committing
   to a visual treatment today.

### No changes to

- Row visuals. Failure still yields no row marker; toast only.
- The `polishingIds` conflict model. Still the single source of truth
  for "apply or discard."
- Schema or migrations.

## Acceptance criteria

- [ ] Gemini client returns the full reason taxonomy above. Each
      branch is reachable from a real upstream condition (or a
      realistic mock).
- [ ] `POST /api/polish` maps each reason to the documented HTTP
      status. The response body always matches the union shape.
- [ ] `Retry-After` from Gemini is forwarded on 429 responses.
- [ ] Server rejects `rawTranscript.length > 4000` with
      `{ reason: "too-long" }` + HTTP 400 without calling Gemini.
- [ ] Client `store.polish(id)` pre-checks `rawTranscript.length` and
      short-circuits with the `too-long` toast when over 4000. The
      server is not called.
- [ ] Each reason produces the documented toast copy. Copy is defined
      in exactly one place in the client codebase.
- [ ] Timeout (15 s) produces `reason: "timeout"` end-to-end and the
      matching toast.
- [ ] Polish remains non-blocking: while one entry is polishing,
      another row can be long-pressed and polished in parallel.
      (Unchanged from slice #2 — regression check only.)
- [ ] Tests:
  - [ ] Gemini client error matrix — mocked `fetch` for: 200 happy,
        429 with `PerMinute` hint, 429 with `PerDay` hint, 429 with no
        hint (→ rate-limited), 500, network throw, malformed JSON
        body, aborted-request (→ timeout). Each asserts the exact
        reason returned.
  - [ ] Server route — too-long body rejected with 400 before the
        client is invoked (assert client is not called); category
        enum validation still works; each reason from the client maps
        to the correct HTTP status; `Retry-After` forwarded on 429.
  - [ ] `entriesStore.polish` — client-side too-long short-circuit:
        no fetch, correct toast, id cleared from `polishingIds`;
        reason-to-toast mapping covered for each branch.
- [ ] Toast copy reviewed against the product voice (short, lowercase
      style where applicable — match existing toasts).
- [ ] `npm run lint`, `npm run test`, and `npm run build` pass.

## Non-goals

- Countdown UI using `retryAfterMs`.
- Client-side rate-limit prevention (tracking RPM).
- Automatic retries (explicitly rejected during grilling).
- Server-side telemetry or audit log of polish calls.

## Blocked by

- Blocked by #2 (polish tracer). Can be worked in parallel with #3.
