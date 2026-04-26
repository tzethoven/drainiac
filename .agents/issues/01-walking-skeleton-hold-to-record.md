# 01 — Walking skeleton: hold-to-record → live transcript on screen

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 1, 2, 3, 4, 25

## What to build

End-to-end minimum viable capture loop. User opens the app, sees a big record button anchored at the bottom of the screen, holds it, speaks, and sees a live transcript appear above the button while speaking. On release, the final transcript is displayed briefly on screen. Sliding the finger up/away while holding cancels the recording.

No parsing, no storage, no inbox yet — this slice proves the mic pipeline works on real devices.

Also sets up the Vitest toolchain so subsequent slices have somewhere to put tests.

## Acceptance criteria

- [ ] `speech-controller` module exists under `src/lib/` wrapping `SpeechRecognition` / `webkitSpeechRecognition` as a Svelte 5 rune-based controller
- [ ] Exposes `start()`, `stop()`, `cancel()` and reactive `{ state, interimText, finalText, error }`
- [ ] `CapturePane` component renders a bottom-centre record button and a live transcript area above it
- [ ] Holding the button starts recording; releasing stops and commits; sliding finger away/up cancels with no commit
- [ ] Live interim transcript updates visibly while speaking
- [ ] First hold triggers the browser microphone permission prompt in-context (no pre-prompt, no onboarding)
- [ ] Final transcript is shown briefly on release (any placement — this slice only proves the pipeline)
- [ ] Root route (`src/routes/+page.svelte`) renders the `CapturePane`
- [ ] Vitest configured and runnable via `npm run test` (config only — no tests required in this slice)
- [ ] Works on Chrome Android and iOS Safari (manual check)

## Blocked by

None — can start immediately.
