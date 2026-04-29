# 05 — EntryRow swipe-left delete + undo toast

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 18, 19

## What to build

Introduce the `EntryRow` component as the unit of interaction, and implement the first gesture: swipe-left to delete with a 5-second undo toast.

1. **`EntryRow`** — replaces the ad-hoc row markup from #02. Renders category badge + `displayText`. Pointer-driven swipe: CSS `transform: translateX(...)` updated on pointermove via a small reusable util; elastic rebound and action-background reveal are CSS. Past threshold on release → commit delete.
2. **`Toast`** — singleton-style component. One toast at a time. Used here for undo-delete; reused by #08 for transcription failures.
3. **Undo** — on delete, Toast shows "Deleted — Undo" for 5 seconds. Tapping Undo re-adds the entry to the store with its original fields preserved. Toast timeout → permanent.

## Design decisions

### Swipe gesture

- **Threshold:** 40% of the row's rendered width. Releasing past this commits the delete; below it rebounds.
- **Scroll conflict:** `touch-action: pan-y` on the row element — browser owns vertical scroll, horizontal pointer events pass through to JS. No `preventDefault()` or angle-lock logic needed.
- **`pointercancel`:** treat identically to a below-threshold release — row rebounds elastically. Keeps behaviour consistent if the browser hijacks the gesture (iOS Safari scroll takeover).

### Reveal background

- Red background + trash icon only. No label.

### Commit animation

- Row snaps to gone: flies off-screen to the left, then height + margin animate to 0 (~200ms ease-out). Neighbouring rows slide up smoothly before the undo toast appears.

### Toast

- **Position:** bottom-center, above the capture button.
- **Mount point:** `+layout.svelte` — layout-level so issue #08 (transcription failures) can reuse it without re-architecting.
- **Stack behaviour:** singleton replace — a second delete while a toast is visible makes the first delete permanent immediately and starts a fresh 5-second window for the new one.

### Undo / pending-delete state

- The deleted entry is **not** soft-deleted in the entries store. It is removed immediately via `entries-store.remove()`.
- The **Toast store** holds the pending entry for the undo window: `{ message: string, undoEntry: Entry | null, timeoutId: ReturnType<typeof setTimeout> }`.
- On undo, the Toast store calls `entries-store.restore(entry)`. On timeout, the entry is garbage collected.

### `restore()` method

- A new `restore(entry: Entry)` method must be added to `EntriesStore` (not currently in the interface).
- It inserts the full `Entry` object as-is (bypasses id/timestamp generation, preserves `createdAt`, `rawTranscript`, etc.).
- Re-insertion order: re-sort the full array by `createdAt` descending after insert. Deterministic and resilient to other adds/deletes during the undo window.

### Swipe util colocation & testing

- The swipe util is colocated inside `EntryRow` (no dedicated module) per the issue spec.
- The threshold/rebound/cancel state machine is written as pure logic that can be unit-tested without DOM or pointer event simulation.
- `restore()` must be covered by the entries-store unit tests.

## Acceptance criteria

- [ ] `EntryRow` component created; inbox renders one per entry
- [ ] `touch-action: pan-y` set on the row; horizontal pointer events drive `translateX`, vertical scroll is unaffected
- [ ] Swipe util colocated in `EntryRow`; threshold is 40% of the row's rendered width
- [ ] Swiping left past threshold reveals a red background + trash icon and on release commits delete via `entries-store.remove()`
- [ ] Committed row flies off-screen left; height + margin collapse (~200ms ease-out)
- [ ] Swipe below threshold rebounds elastically; `pointercancel` also rebounds
- [ ] `Toast` singleton component mounted in `+layout.svelte`, appears bottom-center
- [ ] Delete triggers a 5-second toast with an Undo action ("Deleted — Undo")
- [ ] Second delete while toast is visible makes first delete permanent and starts fresh 5-second window
- [ ] Toast store holds the pending `Entry`; entries store has no soft-delete logic
- [ ] `entries-store` exposes `restore(entry: Entry)` — inserts full entry, re-sorts by `createdAt` desc
- [ ] Undo re-adds the entry to its original position with all fields preserved (same id, createdAt, rawTranscript, etc.)
- [ ] Toast auto-dismisses after 5 seconds; dismissal makes the delete permanent
- [ ] Works on touch (iOS Safari, Chrome Android) and pointer (desktop letterbox)
- [ ] Swipe state machine logic unit-tested; `restore()` covered in entries-store tests

## Blocked by

- #2 (entries-store and row rendering)
