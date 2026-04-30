# PRD — Memento v1 MVP: Voice Capture → Inbox

## Problem Statement

Throughout the day I have thoughts — todos, ideas, stray observations — that demand attention right when I'm trying to focus on something else (reading a book, watching a film, mid-conversation, walking). If I don't offload them immediately they either distract me until I act on them, or I lose them entirely. Opening a note-taking app, picking a list, tapping out text, and choosing where it belongs is too slow: by the time I'm done I've lost my place in whatever I was doing, and the act of categorising *right now* is exactly the cognitive load I was trying to avoid. Existing tools optimise the review experience, not the capture moment.

## Solution

A phone-first PWA whose single job in v1 is to make capture faster than the thought itself. The user holds a big button at the bottom of the screen, speaks a single code-word-prefixed sentence ("todo buy milk", "idea habit stacking for mornings", "note that scene was great"), and releases. The app transcribes, strips the code word, files the entry into the right bucket, and gets out of the way. Later — not now — the user scrolls down to reveal the inbox and processes what they captured. There is no categorisation decision, no form, no confirmation step, and no onboarding; the interaction is one button, one gesture, and three words to remember.

## User Stories

1. As a user consuming a book, I want to hold a single button and speak my thought, so that I can capture it without losing my place on the page.
2. As a user, I want the record button anchored at the bottom of the screen, so that I can reach it with my thumb without adjusting grip.
3. As a user, I want to see the live transcript while I speak, so that I have confidence the microphone is picking me up.
4. As a user, I want to slide my finger up/away while holding to cancel the recording, so that I can abort mid-thought when I realise I don't want to capture it.
5. As a user, I want to prefix my sentence with "todo", "note", or "idea" to pick the category, so that routing happens at the speed of speech with no extra tap.
6. As a user, I want aliases like "to do", "to-do", "task", "notes", "ideas", and "id" to route the same as their canonical words, so that mis-speech and Web Speech mis-transcriptions still land in the right bucket.
7. As a user, I want the code-word match to be case-insensitive and tolerant of leading punctuation, so that "To do, buy milk" works as well as "todo buy milk".
8. As a user, I want the code word stripped from the saved text, so that my inbox reads "Buy milk" and not "Todo buy milk".
9. As a user, I want unrecognised-prefix captures to default to Note, so that no thought is ever rejected for using the wrong vocabulary.
10. As a user, I want basic cleaning applied to the transcript (trim, capitalise first letter, add terminal period, collapse whitespace), so that the inbox reads as tidy sentences instead of raw transcription output.
11. As a user, I want the original raw transcript retained invisibly, so that a future AI cleanup pass has the ground truth to work from and mis-routes can be debugged.
12. As a user, I want to scroll down from the capture view to reveal my inbox, so that I can switch from capturing to processing with a single gesture.
13. As a user, I want the scroll to snap elastically into the inbox when I pull down, so that transitioning between modes feels deliberate and physical.
14. As a user, I want the inbox to scroll freely once I'm inside it, so that I can browse many entries without fighting the snap behaviour.
15. As a user, I want pulling up at the top of the inbox to snap back to capture, so that I can return to recording instantly when a thought hits.
16. As a user, I want my entries grouped by day (Today, Yesterday, specific date) and sorted newest-first, so that recent captures are front and centre during end-of-day processing.
17. As a user, I want a row of category filter chips at the top of the inbox, so that I can quickly see just my todos when I want to tick things off.
18. As a user, I want to swipe a row left to delete it, so that I can clear noise from my inbox without a confirmation dialog.
19. As a user, I want a 5-second undo toast after deleting, so that accidental deletes are trivially recoverable.
20. As a user, I want to swipe a row right to mark it done (for todos) or reviewed (for notes and ideas), so that I have a single consistent "handled" action across all categories.
21. As a user, I want done/reviewed entries to stay visible with strike-through, so that I see my progress accumulate through the day rather than the list shrinking.
22. As a user, I want a "Clear done" button in the inbox header, so that I can sweep handled entries in one action when I'm ready.
23. As a user, I want to tap a row to edit its text, so that I can fix transcription errors or rephrase without deleting and re-recording.
24. As a user, I want to long-press a row to open a menu for changing its category, so that mis-routed captures (from mis-speech or defaulted-to-Note) can be corrected.
25. As a user, I want the permission prompt to appear the first time I hold the record button, so that setup happens in-context rather than as an onboarding step.
26. As a user who has denied microphone permission, I want a clear explanation and instructions for re-enabling it, so that I can recover without guessing which browser setting to change.
27. As a user on an unsupported browser (e.g. Firefox), I want a clear message telling me which browsers work, so that I don't waste time debugging a silently broken app.
28. As a user whose held recording contains no detectable speech, I want a subtle "Didn't catch that" toast and no entry created, so that my inbox isn't polluted with empty rows.
29. As a user whose transcription errors mid-recording but produced some text, I want the partial text saved with a warning icon, so that I don't lose a real thought to a network blip.
30. As a user whose transcription errors with no text captured, I want a clear toast explaining the failure (e.g. "No internet — transcription needs network"), so that I understand why nothing was saved.
31. As a user interrupted mid-recording (phone call, tab switch), I want whatever was transcribed so far to be saved, so that the interruption doesn't cost me the thought.
32. As a user, I want the app installable to my home screen with a proper icon and standalone display, so that opening it feels like opening a native tool rather than a browser tab.
33. As a user, I want the app shell cached offline, so that launching the app with poor connectivity shows the UI instantly rather than a white screen.
34. As a user on a desktop browser, I want the app to display in a phone-width letterbox on a neutral background, so that the mobile design isn't stretched awkwardly across a wide viewport.
35. As a user, I want my entries persisted across app restarts and device reboots, so that captured thoughts aren't lost on refresh.
36. As a user on iOS Safari, I want capture to work on-device without network, so that I can keep capturing during flights or spotty connectivity.
37. As a user, I want a dark-only interface, so that the app doesn't flash bright at me in evening/couch use.
38. As a user editing an entry, I want the edit to persist to storage immediately on save, so that I don't lose corrections if the app is killed afterwards.
39. As a user changing a category via the long-press menu, I want the entry to immediately re-filter under the correct category chip, so that the correction is visibly applied.
40. As a user, I want zero onboarding — no tutorial, no tooltips, no hints — because this is a tool I use daily and want to open straight into work.

## Implementation Decisions

**Stack & platform:**
- SvelteKit with Svelte 5 runes; Tailwind v4 already configured.
- Mobile-only design (iOS Safari + Chrome Android as primary targets). Edge/Chrome desktop work via letterbox, no desktop-specific UX. Firefox is explicitly unsupported in v1.
- Portrait-locked, `display: standalone` PWA.
- No backend, no auth, no sync. All data is local to the device.

**Module architecture — four deep modules + thin UI components:**

1. **transcript-parser** — pure module that takes a raw transcript string and returns `{ category, displayText, rawTranscript }`. Owns the alias map (canonical: `todo`, `note`, `idea`; aliases include `to do`, `to-do`, `task`, `notes`, `ideas`, `id`). Responsible for case-insensitive matching, leading-punctuation tolerance, trigger-word stripping, and the five deterministic cleaning rules (trim, capitalise first letter, ensure terminal period, collapse whitespace — trigger strip is the fifth). Default-to-Note policy lives here. The contract is a single `parse()` function; the alias map is configuration that can grow (for Phase 2's `read`/`watch`/`habit`) without touching the call site.

2. **entries-store** — rune-based reactive store that hides the persistence backend. Operations: add, update, remove, clear-done, plus reactive read accessors for full list and category-filtered lists. v1 serialises the entire entry array as JSON under localStorage key `memento:entries`; Phase 2's SQLite/Drizzle swap changes the internal implementation without changing the interface. Soft-delete is not supported in v1 — delete is immediate, with in-memory undo handled at the UI layer via a 5-second toast that re-adds the entry if dismissed.

3. **speech-controller** — wraps `window.SpeechRecognition` / `webkitSpeechRecognition` into a reactive Svelte-5-friendly controller. Exposes `start()`, `stop()`, `cancel()` methods and reactive `{ state, interimText, finalText, error }`. Normalises the messy cross-browser error taxonomy into a small set: `not-supported`, `permission-denied`, `no-speech`, `network`, `aborted`, `audio-capture`, `unknown`. Implements the seven failure-case policy from the design discussion (empty-transcript drop, partial-on-error save, network-error toast, etc.) — the component layer consumes the controller's state and maps it to UI/toast calls.

4. **day-grouper** — pure function that buckets an entry array into ordered sections labelled `Today`, `Yesterday`, a weekday name (for entries within the last week), or a specific date string (older). Accepts `now` as a parameter to keep it testable across timezones and midnight boundaries.

**UI components (shallow, composed from the above):**

- `ScrollSnapLayout` — two-pane vertical scroll container. CSS-native: `scroll-snap-type: y mandatory` on the outer element; capture pane `height: 100vh` with snap-align start; inbox pane `min-height: 100vh` with snap-align start at its top edge only. Asymmetric behaviour (elastic snap to/from, free scroll inside the inbox) falls out of this setup without JS scroll handling.
- `CapturePane` — full-viewport component containing the bottom-centre record button, the live transcript display above it, and the permission/unsupported-browser states. Consumes `speech-controller`; on release calls `transcript-parser` then `entries-store.add`.
- `InboxPane` — consumes `entries-store` and `day-grouper`, renders grouped sections with the category filter chip row pinned to the pane top, plus the "Clear done" action.
- `EntryRow` — renders a single entry with category badge, display text, strike-through when done. Implements the four gestures locally: swipe-left (delete), swipe-right (toggle done), tap (open edit), long-press (open menu). Swipe is implemented with pointer events updating CSS `transform: translateX(...)` via a small reusable util function; the elastic rebound and action-background reveal are CSS. No dedicated swipe-gesture module — the behaviour lives in the row because nothing else uses it.
- `EditSheet` / `MenuSheet` — bottom-sheet components for the edit and long-press-menu flows respectively.
- `Toast` — small singleton-style component for the undo-delete toast and transcription-failure messages.

**Schema:**

The entry type carries exactly these fields:

- `id` — string, locally generated unique identifier.
- `schemaVersion` — literal `1`; reserved for future migrations.
- `category` — `'todo' | 'note' | 'idea'`.
- `displayText` — the current best-readable version shown in the UI; v1 writes the cleaned version from `transcript-parser`; a future AI pass may overwrite it.
- `rawTranscript` — the immutable original Web Speech output, including the trigger word; never overwritten.
- `source` — `'voice' | 'text'` (v1 only ever writes `'voice'`; the field exists so a Phase 2 typed-capture path needs no migration).
- `done` — boolean; field is universal but the UI label is contextual (`Done` for todos, `Reviewed` for notes/ideas).
- `createdAt` — epoch milliseconds.
- `updatedAt` — epoch milliseconds.
- `processedAt?` — optional epoch milliseconds, reserved; set by the future AI cleaning pass, never written in v1.

**Routing contract:**

Input is the final transcript from `speech-controller`. The parser examines the first token (or first two tokens, to handle `"to do"`), matched case-insensitively against the alias map after stripping leading punctuation/whitespace. On match: strip the matched trigger from the front, apply the cleaning rules to the remainder, return the matched canonical category. On no match: apply cleaning rules to the whole transcript, return category `note`. Empty/whitespace-only transcripts are not passed to the parser — `speech-controller` handles them as the "didn't catch that" case.

**PWA:**

Manifest, icons, and service worker are already scaffolded in the repo (`static/manifest.json`, `static/icons/`, `src/service-worker.ts`) and the theme colour is already set to `#c70036`. v1 verifies these work end-to-end after the app is built; no new PWA work unless something is broken. No push notifications, no background sync, no offline-aware UI (network errors are handled reactively via the Q9 policy, not preemptively).

**Styling:**

Dark-only. Uses the existing `app.css` design tokens (Geist Variable font, rose-red primary, OKLCH palette). No light-mode variant. Icons from lucide (already installed): approximately mic, check, trash, edit, more. Animations: CSS for scroll-snap spring, record-button pulse while recording, strike-through transition, row-delete collapse; JS only for the pointer-driven swipe transform.

## Testing Decisions

**Principle:** test external behaviour only — inputs and outputs of each module's public interface. Internal helpers (e.g. an alias-normalisation function inside the parser) are not tested directly; they're exercised via the module's public surface. No snapshot tests. No component tests in v1 — the Q13 seven-step manual acceptance walkthrough is the integration-level sign-off.

**Modules under test:**

1. **transcript-parser** — the highest-ROI test target because it encodes the routing rules. Tests cover: each canonical trigger word routes to its category; each alias resolves to the right canonical; case-insensitivity (`TODO`, `Todo`, `todo`); leading punctuation (`"Todo, buy milk"`, `"  todo buy milk"`); two-word alias handling (`"to do buy milk"` → todo); the trigger word is stripped from `displayText`; no-match defaults to `note` and the full text is kept; each cleaning rule (trim, capitalise, terminal period, whitespace collapse); combined edge cases (e.g. single-word utterances, trigger-only utterances). `rawTranscript` field always equals the input verbatim.

2. **entries-store** — tests cover: add persists an entry and makes it reactively readable; update modifies the entry and bumps `updatedAt`; remove eliminates the entry from the list; clear-done removes all `done === true` entries regardless of category; reactive reads reflect mutations synchronously; serialisation to localStorage round-trips all fields including `rawTranscript` and `processedAt` absence; re-instantiating the store reads prior state correctly; the `schemaVersion: 1` field is written on every new entry. localStorage is mocked or a real implementation (e.g. happy-dom / jsdom) is used — either is fine, the assertion is on observable behaviour, not on the storage call shape.

3. **day-grouper** — tests cover: entries from today group under "Today"; yesterday under "Yesterday"; entries within the last week but older than yesterday use their weekday name; older entries use a date string; empty input returns an empty section list; section order is newest-first; entries within a section are newest-first; midnight-boundary edge cases (an entry at 23:59 yesterday vs. 00:01 today); the `now` parameter is respected so tests are deterministic across timezones.

**Not tested in v1:**

- **speech-controller** — integration-level territory; mocking `SpeechRecognition` for every error path is high-cost, low-signal. Manual verification against the Q13 acceptance test (including the offline Safari vs. offline Chrome cases) is the sign-off.
- **UI components** — covered by the Q13 seven-step manual acceptance walkthrough. Component tests will be introduced when Phase 2 adds complexity that benefits from them.
- **Service worker and manifest** — verified manually via "Add to Home Screen" and an offline relaunch during the acceptance test.

**Prior art in this codebase:** none yet — this is the first feature and the first test setup. The test runner should be whichever Svelte/Vite-native option is simplest (Vitest is the obvious default). Test files live alongside the module they cover (e.g. `transcript-parser.test.ts` next to `transcript-parser.ts`).

## Out of Scope

The following are explicitly deferred beyond v1:

- Authentication (BetterAuth, Google OAuth, or any other).
- SQLite / Drizzle persistence — v1 uses localStorage only.
- Work/private separation — v1 has a single bucket.
- Categories beyond todo/note/idea — no reading list, watch list, habit tracker, feelings log, or free-form tags.
- Gamification — no XP, streaks, levels, or celebratory completion animations beyond basic strike-through.
- Any AI layer — no inferred routing, no confirmation dialogs, no cleanup pass, no summarisation. The `processedAt` field is reserved but never written.
- Search, tagging, cross-linking, or content-session modes.
- Push notifications, reminders, scheduled prompts.
- End-of-day review mode, weekly review, zen mode, mood check-in.
- Export, backup, import, multi-device sync.
- Audio blob storage or playback — only transcripts are persisted.
- Typed-text capture fallback — voice is the only input method.
- Light mode, theming, a settings screen, or any user-configurable preferences.
- Onboarding flows, tooltips, hints, chip rows advertising code words, first-run walkthroughs.
- Desktop-optimised layout, keyboard shortcuts (e.g. space-to-record).
- Firefox support.
- Persistent record button on the inbox pane — returning to capture requires scrolling up.

## Further Notes

- The design has been explicitly stress-tested end-to-end in a prior grill-me session; this PRD captures the resolved decisions from that conversation. Ambiguity that survived that session is intentional (e.g. exact swipe threshold values, toast dismissal timings) and will be resolved during implementation against feel.
- The schema is deliberately forward-compatible with Phase 2's likely additions: AI cleanup (`processedAt`), typed capture (`source`), SQLite migration (`schemaVersion`). None of those trigger a data migration; they're already expressible.
- The `speech-controller` is the most fragile piece of v1 because Web Speech behaviour varies across browsers and OS versions. Expect to iterate on its error taxonomy after real-device testing, particularly on iOS Safari where the API has historically been flaky.
- "Capture is sacred" is the north star. If an implementation choice during build trades capture latency or reliability for anything else (polish, correctness of categorisation, cleaner code), capture wins.
- Definition of done is the seven-step acceptance walkthrough: install to home screen; capture a todo, idea, and note; scroll to inbox; swipe-right, swipe-left with undo, tap-to-edit, long-press to change category; kill and reopen to verify persistence; verify offline behaviour on Safari (works) and Chrome Android (clear network-error toast).
