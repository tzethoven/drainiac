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
- iOS Safari on-device capture works without network (per US 36) — **best-effort for v1; see design decisions below**
- Chrome Android shows clear network-error toast when offline (per US 30 via #08)

### Acceptance walkthrough (7 steps, per PRD "Definition of done")

1. Install the app to the home screen via Add to Home Screen
2. Capture a todo, an idea, and a note by voice
3. Scroll down to reveal the inbox
4. Swipe-right to mark done; swipe-left with undo; tap-to-edit; long-press to change category
5. Kill and reopen the app — entries persist
6. On iOS Safari offline: capture still works
7. On Chrome Android offline: clear network-error toast shown

## Design decisions

Resolved via grill-me session against the PRD and current codebase state.

### Desktop letterbox (the only net-new code)

- **Location:** `src/routes/+layout.svelte`, wrapping `{@render children()}`. Treated as app-shell chrome, not page layout, so any future route inherits it.
- **Activation breakpoint:** `md:` (≥768px). Below 768px, mobile renders edge-to-edge and is visually unchanged.
- **Inner column:** `max-w-sm mx-auto` (384px) — stock Tailwind token, close enough to real iPhone width that desktop preview matches on-device. Inner column keeps `bg-background` (the existing app surface).
- **Outer backdrop:** `bg-neutral-900 min-h-svh` on the layout wrapper. Pure-neutral dark (no rose tint) so the seam between outer and inner is perceptible without decoration. Matches PRD phrase "neutral dark background".
- **Visual treatment:** flat — no border, no shadow, no rounded corners, no phone frame. PRD describes placement, not framing. Zero risk of frame interfering with `h-svh`, scroll-snap, or `EntryRow` swipe gestures. The existing `+page.svelte` scroll-snap container (`h-svh overflow-y-scroll snap-y snap-mandatory`) is untouched.

### Service worker: offline cold-launch fix

The current `src/service-worker.ts` only caches `build` + `files` (JS chunks, static assets). With `adapter-cloudflare` and no prerender, a navigation request for `/` on cold offline launch hits the `fetch().catch()` branch and returns the "Offline" 503 string instead of the app shell. This fails US 33 and the "offline cold-launch shows the UI instantly" acceptance criterion.

**Fix:**

1. Add `export const prerender = true;` to `src/routes/+layout.ts` (create if needed). The app's runtime is entirely client-side (localStorage, Web Speech, no loaders), so prerendering the root is semantically a no-op. `adapter-cloudflare` serves prerendered pages as static assets.
2. Union `prerendered` from `$service-worker` into `ASSETS` so `/` is precached on install.
3. Add a navigation branch to the fetch handler:
   ```ts
   if (event.request.mode === 'navigation') {
     event.respondWith(caches.match('/').then((c) => c ?? fetch(event.request)));
     return;
   }
   ```

### Small fixes bundled into this issue

Surfaced during grill, both unambiguously in scope:

- **Manifest orientation lock** — add `"orientation": "portrait"` to `static/manifest.json`. PRD explicitly calls for portrait-locked. Scope line literally names this.
- **Dark-only root colours** — `app.css` currently has `:root { --background: oklch(1 0 0); }` (white) with dark values only applied under `.dark`. Currently safe because `app.html` hardcodes `class="dark"` on `<html>`, but fragile. Invert: put the dark token values directly on `:root` so the app cannot flash white regardless of the `.dark` class. Matches "Audit all surfaces for dark-only (no light flash)" scope line.

### Dark-only + onboarding audit

Mechanical verification, no design decisions:

- Grep for `prefers-color-scheme`, light-mode Tailwind classes (`bg-white`, `text-black`, explicit light neutrals), hardcoded white/light surfaces.
- Grep for onboarding / tooltip / hint / welcome / tutorial strings and components.
- Manual dev-server pass on desktop confirming letterbox + inbox scroll + swipe + sheets all render correctly within the 384px column.

### iOS Safari offline capture (US 36) — best-effort for v1

Web Speech on iOS Safari has historically required network; on-device recognition is inconsistent across iOS versions with no API to query which mode is active. The PRD's "works offline on iOS Safari" is an assumption, not a verified capability.

**Exit criteria for step 6 of the walkthrough:**

- If capture succeeds offline on the test device → acceptance met, ship as-is.
- If it errors or hangs → downgrade US 36 to match US 30 behaviour (clear error toast, same as Chrome Android). Mark this issue's acceptance item as met *as downgraded*. Ship v1 anyway.

Rationale: the PRD's north star is capture-sacred for success cases, not preventing graceful failure of capabilities we do not own. v1 is not blocked on Apple's on-device speech availability.

### HITL mechanics

- Agent executes the fixable bits (letterbox, prerender + SW navigation branch, manifest orientation, dark `:root`, audits).
- Human executes the 7-step walkthrough on real iOS Safari and real Chrome Android.
- No formal acceptance artifact. Ephemeral pass/fail handoff in-session.
- v1.1 follow-up filing protocol deferred — decide when a follow-up is actually needed.

### Known risk (not pre-decided)

On iOS Safari, `h-svh` on the scroll-snap sections may leave a strip of outer background visible when the URL bar collapses mid-scroll. If it surfaces during the walkthrough it's a finding to disposition then, not a pre-decision.

## Acceptance criteria

- [ ] Manifest and icons verified; `"orientation": "portrait"` added; Add to Home Screen produces a standalone app with correct icon and theme
- [ ] Service worker precaches the prerendered `/` shell; navigation requests served from cache; offline cold-launch shows the UI instantly
- [ ] Desktop (Chrome/Edge, ≥768px) renders in a 384px phone-width letterbox on a `neutral-900` background; mobile (<768px) is visually unchanged
- [ ] `app.css` `:root` holds dark token values directly; no reliance on the `.dark` class for happy-path rendering
- [ ] No light-mode surfaces anywhere in the app (grep + visual pass clean)
- [ ] No onboarding, tooltips, or hints present (grep + visual pass clean)
- [ ] 7-step acceptance walkthrough completed on real iOS Safari and real Chrome Android
- [ ] Step 6 outcome recorded; if iOS offline capture fails, US 36 downgraded to US 30 behaviour and v1 ships
- [ ] Any other issues surfaced by the walkthrough are either fixed or filed as v1.1 follow-ups

## Blocked by

- #3 (scroll-snap layout)
- #4 (grouping, filters, clear done)
- #6 (done/reviewed gesture)
- #7 (edit and category-change flows)
- #8 (error handling and offline toasts)
