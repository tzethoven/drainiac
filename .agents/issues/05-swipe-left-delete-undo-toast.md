# 05 — EntryRow swipe-left delete + undo toast

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 18, 19

## What to build

Introduce the `EntryRow` component as the unit of interaction, and implement the first gesture: swipe-left to delete with a 5-second undo toast.

1. **`EntryRow`** — replaces the ad-hoc row markup from #02. Renders category badge + `displayText`. Pointer-driven swipe: CSS `transform: translateX(...)` updated on pointermove via a small reusable util; elastic rebound and action-background reveal are CSS. Past threshold on release → commit delete.
2. **`Toast`** — singleton-style component. One toast at a time. Used here for undo-delete; reused by #08 for transcription failures.
3. **Undo** — on delete, Toast shows "Deleted — Undo" for 5 seconds. Tapping Undo re-adds the entry to the store with its original fields preserved. Toast timeout → permanent.

## Acceptance criteria

- [ ] `EntryRow` component created; inbox renders one per entry
- [ ] Pointer-driven swipe util reusable within the row (no dedicated module — colocated)
- [ ] Swiping left past threshold reveals a delete action background and on release deletes the entry via `entries-store.remove`
- [ ] Swipe below threshold rebounds elastically
- [ ] `Toast` singleton component implemented
- [ ] Delete triggers a 5-second toast with an Undo action
- [ ] Undo re-adds the entry with all original fields preserved (same id, createdAt, rawTranscript, etc.)
- [ ] Toast auto-dismisses after 5 seconds; dismissal makes the delete permanent
- [ ] Works on touch (iOS Safari, Chrome Android) and pointer (desktop letterbox)

## Blocked by

- #2 (entries-store and row rendering)
