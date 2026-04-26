# 07 — Tap-to-edit + long-press category menu

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 23, 24, 38, 39

## What to build

Two more `EntryRow` interactions, each opening a bottom sheet:

1. **Tap → `EditSheet`** — opens with the row's `displayText` pre-filled in a text input. Save updates `displayText` and bumps `updatedAt`. Persists immediately.
2. **Long-press → `MenuSheet`** — opens a menu with "Change category" offering `Todo`, `Note`, `Idea` (excluding the current one). Selecting updates `category` and `updatedAt`. The row re-filters under the new chip immediately.

Both sheets use the existing dark styling tokens from `app.css`. Dismissed by backdrop tap or swipe-down.

## Acceptance criteria

- [ ] `EditSheet` component: bottom sheet with text input, Save, Cancel
- [ ] Tap on row opens `EditSheet` with current `displayText`
- [ ] Save calls `entries-store.update`, bumps `updatedAt`, persists to localStorage immediately
- [ ] Cancel or backdrop dismiss discards changes
- [ ] `MenuSheet` component: bottom sheet listing the two alternative categories
- [ ] Long-press on row opens `MenuSheet`
- [ ] Selecting a category updates the entry; if a category filter chip is active, the row visibly moves out of the current filter view
- [ ] Tap and long-press gestures don't conflict with swipe left/right thresholds
- [ ] `rawTranscript` is never mutated by either flow

## Blocked by

- #5 (EntryRow infrastructure)
