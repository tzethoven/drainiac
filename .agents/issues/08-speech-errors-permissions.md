# 08 — Speech error taxonomy + permission / unsupported states

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 25, 26, 27, 28, 29, 30, 31

## What to build

Harden `speech-controller` and the capture UX against the seven failure cases. The controller's cross-browser error noise is normalised into a small taxonomy; the capture layer maps each case to the right UI response.

### Seven failure-case policy

1. **Empty transcript** (no speech detected) → no entry created; subtle "Didn't catch that" toast.
2. **Partial-then-error** (some text captured before failure) → save entry with a warning icon shown on the row.
3. **Network error mid-recording, no text** → clear toast, no entry.
4. **Interruption** (phone call, tab switch) → save whatever was transcribed so far (no warning icon — user's thought was just cut short).
5. **Permission denied** → capture pane shows a clear explainer with instructions to re-enable the mic in browser settings.
6. **Unsupported browser** (Firefox etc.) → capture pane shows a message naming supported browsers.
7. **First-hold permission prompt** → native browser prompt only; no app-level pre-prompt or onboarding copy.

---

## Design

### State machine (`speech-controller.svelte.ts`)

Mapping from raw Web Speech errors to the taxonomy lives in the **controller**, not the engine and not the UI. The engine stays a dumb forwarder of raw event strings; the UI consumes a clean domain vocabulary.

```ts
export type SpeechState =
  | "unsupported"        // sticky, synchronous at construction
  | "permission-denied"  // sticky, from not-allowed / service-not-allowed
  | "idle"
  | "recording"
  | "error";             // transient only, cleared on next start()

export type SpeechErrorCode =
  | "no-speech"
  | "network"
  | "aborted"
  | "audio-capture"
  | "unknown";

interface SpeechController {
  readonly state: SpeechState;
  readonly interimText: string;
  readonly finalText: string;
  readonly error: SpeechErrorCode | null;  // only populated when state === "error"
  start(): void;
  stop(): void;
  cancel(): void;
}
```

**Why two sticky states alongside `"error"`:** `unsupported` and `permission-denied` are both capability-level blocking facts with identical UX consequences (button replaced by explainer, `start()` is a no-op). Promoting them to top-level states lets every consumer branch once, rather than checking `state === "error" && error === "permission-denied"` plus `state === "unsupported"` separately. `state === "error"` therefore always means "the last user-initiated recording failed, recoverable on next hold".

### Raw → taxonomy mapping

| Raw `event.error`        | Outcome                                              |
|--------------------------|------------------------------------------------------|
| `not-allowed`            | `state = "permission-denied"` (always surfaces, even idle) |
| `service-not-allowed`    | `state = "permission-denied"` (collapsed — same remediation as user denial) |
| `no-speech`              | `error = "no-speech"` → transient                    |
| `network`                | `error = "network"` → transient                      |
| `aborted`                | Context-aware (see rule 3 below)                     |
| `audio-capture`          | `error = "audio-capture"` → transient                |
| `language-not-supported` | `error = "unknown"`                                  |
| `bad-grammar`            | `error = "unknown"`                                  |
| other / missing          | `error = "unknown"`                                  |

### Controller rules

1. **Unsupported is detected synchronously** at construction. If `window.SpeechRecognition` / `webkitSpeechRecognition` is missing and no `recognitionFactory` override is provided, `state = "unsupported"` before the constructor returns. Required because `CapturePane` renders the unsupported explainer on mount — there's no meaningful "idle" intermediate UI.
2. **`start()` is a no-op** when `state` is `"unsupported"` or `"permission-denied"`. Browser's permission decision is page-scoped; re-calling `start()` after denial just produces the same error.
3. **`aborted` is context-aware.** The controller tracks whether an abort followed a self-initiated `stop()` / `cancel()`. Self-initiated aborts are swallowed (state stays where `stop`/`cancel` put it). External aborts (tab switch, phone call, backgrounding) surface as `error = "aborted"` — the UI uses this to execute case #4 (save partial).
4. **Errors are suppressed when `state !== "recording"`**, with one exception: `permission-denied` always surfaces. This prevents pre-warming silence-timeouts from firing "Didn't catch that" toasts on an idle page every ~10 seconds.
5. **All surfaced errors terminate the current recording session** — the controller cancels the engine's auto-respawn for the affected session. Next `start()` spawns fresh.
6. **Pre-warming is kept unchanged.** `speech-engine.ts` is not modified. Consequence: the native browser permission prompt may fire on page load (when the pre-warming engine first calls `recognition.start()`), not strictly on first hold. This is an explicit interpretation of story 31 / AC 7 — we don't add an app-level pre-prompt; the browser's native prompt is the only prompt. A beneficial side-effect: if the user denies on page load, we detect it early and render the explainer before the first hold.

### Entry schema

`Entry` and `AddInput` (`src/lib/stores/entries-store.svelte.ts`) gain one optional field:

```ts
warning?: "partial-transcription";
```

- String-literal union (not boolean) so we can add further values later (e.g. `"edited-after-capture"`) without a schema migration.
- Naming matches the PRD/issue language ("warning icon").
- No `schemaVersion` bump — the field is additive and safely `undefined` on pre-existing persisted entries. Existing callers of `add()` are unaffected.

### Toast store widening

The existing toast singleton (`src/lib/stores/toast-store.svelte.ts`) is undo-only: `show(message, undoEntry: Entry)` with a required entry. The new error toasts have no undo action, so we widen:

```ts
show(message: string, undoEntry?: Entry): void;
```

`Toast.svelte` is updated to render the `—` separator and **Undo** button **only when `toast.undoEntry` is present**. Existing undo call sites are unaffected.

### CapturePane policy (effect-driven)

A `$effect` watches `controller.state` transitions *out of* `"recording"`. This single reactive rule handles pointer release, mid-recording errors, and external interruptions uniformly — `endHold` no longer needs to inspect errors. Cancel (slide-up) stays pointer-driven because it's user intent, not a state transition.

| End reason (code)                              | Partial text | Action                                                |
|------------------------------------------------|--------------|-------------------------------------------------------|
| Pointer release, no error                      | yes          | save, no warning                                      |
| Pointer release, no error                      | no           | toast `"Didn't catch that"`                           |
| `error: "no-speech"`                           | any          | toast `"Didn't catch that"`, no entry                 |
| `error: "network"`                             | no           | toast `"Speech recognition needs a connection — try again"` |
| `error: "network"`                             | yes          | save **with warning**, same toast                     |
| `error: "audio-capture"`                       | no           | toast `"Microphone unavailable"`                      |
| `error: "audio-capture"`                       | yes          | save **with warning**, same toast                     |
| `error: "unknown"`                             | no           | toast `"Something went wrong — try again"`            |
| `error: "unknown"`                             | yes          | save **with warning**, same toast                     |
| `error: "aborted"` (external — interruption)   | yes          | save, **no warning** (case #4)                        |
| `error: "aborted"` (external)                  | no           | silent, no entry, no toast                            |
| `state: "permission-denied"`                   | any          | no entry; pane flips to explainer                     |
| User cancel (slide-up)                         | any          | discard, no toast (unchanged)                         |

**Warning icon semantics.** The icon marks transcripts whose quality we suspect (network/audio-capture/unknown mid-flight error after partial text). Case #4 interruptions *don't* get the warning — the transcript is complete for what the user managed to say; the user's thought was cut short, not the transcription.

**Network toast wording note.** The PRD's example was `"No internet — transcription needs network"`. We use `"Speech recognition needs a connection — try again"` because the raw `network` error can fire for reasons unrelated to the user's connectivity (Chrome backend unreachable, quota exhausted, captive portal) — the softer wording is honest and nudges toward the fix.

### CapturePane layout

Top-level template branch (before the existing recording UI):

- `state === "unsupported"` → **full-pane replacement** with a centred explainer listing supported browsers (Chrome Android, iOS Safari, desktop Chrome / Edge). No button, no transcript area.
- `state === "permission-denied"` → **full-pane replacement** with an explainer + a **"Reload page"** button. Instructions are **static** (both iOS Safari and Chrome/Edge blocks listed side-by-side) — no UA sniffing. UA sniffing is unreliable (iPad claims macOS, Chrome-on-iOS is WebKit, in-app webviews lie) and the copy is short enough that listing both platforms is strictly more correct.
- Otherwise → existing recording UI (transcript area + record button).

**Button replacement rather than disable.** In both sticky states the button is useless; keeping it disabled invites repeated taps and implies recoverability. The explainer is the primary surface.

**Reload button (not "Try again").** A "Try again" button would be a trap — the page-scoped permission decision is cached, so re-calling `start()` fails identically. Reload is the actual fix after the user changes browser settings.

### EntryRow

When `entry.warning === "partial-transcription"`, render a warning icon next to the category badge.

### Testability

The existing `speech-controller.fake.ts` is sufficient. Tests drive the controller through the real event surface by emitting raw Web Speech error strings via `FakeRecognition.emitError(...)` / `emitEnd()`, and assert on the normalised `controller.state` / `controller.error`.

`unsupported` is tested by calling `createSpeechController()` with no `recognitionFactory` in an environment that lacks `window.SpeechRecognition` — the assertion is synchronous.

---

## Acceptance criteria

- [ ] `speech-controller` exposes the `SpeechState` / `SpeechErrorCode` taxonomy above; raw Web Speech strings are mapped internally.
- [ ] `state === "unsupported"` is set synchronously at construction when no `SpeechRecognition` is available.
- [ ] `state === "permission-denied"` is set on `not-allowed` / `service-not-allowed`, even when fired outside an active recording.
- [ ] `start()` is a no-op when `state` is `"unsupported"` or `"permission-denied"`.
- [ ] External `aborted` events surface as `error = "aborted"`; self-initiated aborts from `stop()` / `cancel()` do not.
- [ ] Non-`permission-denied` errors fired while `state !== "recording"` are swallowed (no state change, no `error` set).
- [ ] Any surfaced error terminates the current recording session (engine does not auto-respawn for that session).
- [ ] Entry schema: optional `warning?: "partial-transcription"` on `Entry` and `AddInput`; no `schemaVersion` bump; existing callers unaffected.
- [ ] Toast store: `show(message, undoEntry?: Entry)`; `Toast.svelte` renders the Undo affordance only when `undoEntry` is present.
- [ ] Empty-transcript release: no store write; "Didn't catch that" toast.
- [ ] Partial-then-`network` / `audio-capture` / `unknown`: entry saved with `warning: "partial-transcription"`; row renders a warning icon next to the category badge; corresponding toast shown.
- [ ] `network` with no partial: no entry; `"Speech recognition needs a connection — try again"` toast.
- [ ] `audio-capture` with no partial: no entry; `"Microphone unavailable"` toast.
- [ ] `unknown` with no partial: no entry; `"Something went wrong — try again"` toast.
- [ ] External-abort interruption with partial: entry saved, **no** warning flag.
- [ ] External-abort interruption with no partial: silent, no entry, no toast.
- [ ] `state === "permission-denied"`: `CapturePane` replaces its full contents with the static iOS Safari + Chrome/Edge explainer and a "Reload page" button.
- [ ] `state === "unsupported"`: `CapturePane` replaces its full contents with a message listing supported browsers (Chrome Android, iOS Safari, desktop Chrome/Edge).
- [ ] No app-level pre-prompt copy is added; the browser's native prompt is the only permission UI. (Pre-warming is retained; native prompt may therefore fire on page load.)

## Blocked by

- #1 (speech-controller exists)
- #5 (Toast singleton — widened as part of this issue)
