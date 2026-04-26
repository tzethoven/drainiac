# 03 — ScrollSnapLayout: elastic capture ↔ inbox

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 12, 13, 14, 15

## What to build

Two-pane vertical layout where capture is the default view and the inbox is revealed by scrolling down. Transition feels elastic and deliberate; inbox scrolling is free once inside.

CSS-native implementation: `scroll-snap-type: y mandatory` on the outer container; capture pane is `height: 100vh` with `scroll-snap-align: start`; inbox pane is `min-height: 100vh` with `scroll-snap-align: start` at its top edge only. Asymmetric behaviour falls out of this — no JS scroll handling.

## Acceptance criteria

- [ ] `ScrollSnapLayout` component composes `CapturePane` and `InboxPane` (the existing flat list from #02) as two snap children
- [ ] Pull down from capture snaps elastically into the inbox
- [ ] Inside the inbox, scrolling is free (many entries browsable without fighting snap)
- [ ] Pull up while at the top of the inbox snaps back to capture
- [ ] Snap behaviour works smoothly on iOS Safari and Chrome Android
- [ ] No JS scroll-position handling — pure CSS

## Blocked by

- #2 (inbox pane must exist with content to snap to)
