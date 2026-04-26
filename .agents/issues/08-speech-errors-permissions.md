# 08 — Speech error taxonomy + permission / unsupported states

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 25, 26, 27, 28, 29, 30, 31

## What to build

Harden `speech-controller` and the capture UX against the seven failure cases. The controller's cross-browser error noise is normalised into a small taxonomy; the capture layer maps each case to the right UI response.

### Normalised error taxonomy

`not-supported | permission-denied | no-speech | network | aborted | audio-capture | unknown`

### Seven failure-case policy

1. **Empty transcript** (no speech detected) → no entry created; subtle "Didn't catch that" toast.
2. **Partial-then-error** (some text captured before failure) → save entry with a warning icon shown on the row.
3. **Network error mid-recording, no text** → clear toast (e.g. "No internet — transcription needs network"), no entry.
4. **Interruption** (phone call, tab switch) → save whatever was transcribed so far.
5. **Permission denied** → capture pane shows a clear explainer with instructions to re-enable the mic in browser settings.
6. **Unsupported browser** (Firefox etc.) → capture pane shows a message naming supported browsers.
7. **First-hold permission prompt** → in-context; no pre-prompt, no onboarding copy.

## Acceptance criteria

- [ ] `speech-controller` error state normalised to the 7-case taxonomy
- [ ] Empty-transcript release: no store write; "Didn't catch that" toast shown
- [ ] Partial-then-error: entry saved via parser→store; row renders a warning icon next to the category badge
- [ ] Network-error-with-no-text: no entry; explicit network-error toast
- [ ] Interruption mid-recording: final partial text saved as an entry
- [ ] Permission-denied state in `CapturePane`: explainer text + steps to re-enable in iOS Safari and Chrome settings
- [ ] `not-supported` state in `CapturePane`: message listing supported browsers (Chrome Android, iOS Safari, desktop Chrome/Edge)
- [ ] First-hold triggers the native permission prompt with no preceding pre-prompt
- [ ] Entry schema warning flag (or derived UI from absence of expected data) is consistent and does not alter the public store API

## Blocked by

- #1 (speech-controller exists)
- #5 (Toast singleton)
