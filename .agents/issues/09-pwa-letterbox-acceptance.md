# 09 — PWA verification + desktop letterbox + acceptance walkthrough

**Type:** HITL
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 32, 33, 34, 36, 37, 40

## What to build

Final polish and real-device sign-off. The PWA scaffolding (`static/manifest.json`, `static/icons/`, `src/service-worker.ts`) already exists — verify it works end-to-end and fix anything broken. Add the desktop letterbox. Confirm dark-only styling holds across all surfaces. Then run the full acceptance walkthrough.

### Scope

- Verify manifest name, icons, `display: standalone`, portrait orientation lock, theme colour `#c70036`
- Verify service worker caches the app shell and the app launches offline with a cached UI (not a white screen)
- Desktop letterbox: on wide viewports, render the app in a phone-width column on a neutral dark background
- Audit all surfaces for dark-only (no light flash, no unthemed white backgrounds)
- Confirm no onboarding / tooltips / hints anywhere
- iOS Safari on-device capture works without network (per US 36)
- Chrome Android shows clear network-error toast when offline (per US 30 via #08)

### Acceptance walkthrough (7 steps, per PRD "Definition of done")

1. Install the app to the home screen via Add to Home Screen
2. Capture a todo, an idea, and a note by voice
3. Scroll down to reveal the inbox
4. Swipe-right to mark done; swipe-left with undo; tap-to-edit; long-press to change category
5. Kill and reopen the app — entries persist
6. On iOS Safari offline: capture still works
7. On Chrome Android offline: clear network-error toast shown

## Acceptance criteria

- [ ] Manifest and icons verified; Add to Home Screen produces a standalone app with correct icon and theme
- [ ] Service worker caches shell; offline cold-launch shows the UI instantly
- [ ] Desktop (Chrome/Edge) renders in a phone-width letterbox on a neutral dark background
- [ ] No light-mode surfaces anywhere in the app
- [ ] No onboarding, tooltips, or hints present
- [ ] 7-step acceptance walkthrough completed on real iOS Safari and real Chrome Android
- [ ] Any issues surfaced by the walkthrough are either fixed or filed as v1.1 follow-ups

## Blocked by

- #3 (scroll-snap layout)
- #4 (grouping, filters, clear done)
- #6 (done/reviewed gesture)
- #7 (edit and category-change flows)
- #8 (error handling and offline toasts)
