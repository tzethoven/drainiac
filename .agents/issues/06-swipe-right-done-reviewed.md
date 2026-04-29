# 06 — Swipe-right done/reviewed + strike-through

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 20, 21

## What to build

Add the second `EntryRow` gesture: swipe-right toggles the universal `done` flag. Label is contextual — "Done" for todos, "Reviewed" for notes and ideas — but the underlying field and store call are the same.

Done/reviewed entries remain visible with strike-through styling so the user sees progress accumulate through the day. `Clear done` (from #04) is the sweep action.

## Design decisions

### Swipe-right commit animation

Row snaps back to center with an ease-out transition (~300ms) after releasing past threshold. The row stays in the list — no fly-off or collapse. The strike-through/opacity change appears reactively as the row settles back.

### Right-side reveal background

Green background + checkmark icon + contextual text label. Green = done is a universal pattern and visually distinguishes the right action (constructive) from the left (red = destructive).

### Label when entry is already done (un-done gesture)

- Not done → `"Done"` (todo) / `"Reviewed"` (note/idea)
- Already done → `"Undo Done"` (todo) / `"Undo Reviewed"` (note/idea)

Same green colour in both states — the label change is sufficient to communicate the reversal.

### Strike-through transition

Opacity fade only. `done === true` applies `line-through` + `opacity-60` (already wired up in `EntryRow`). The opacity fade during the snap-back reads as smooth in practice. No pseudo-element animation needed.

### `swipe-state` changes

Extend the existing `createSwipeState` to handle both directions:

- `onMove(dx)` clamps to `[−rowWidth, +rowWidth]` (was `[−rowWidth, 0]`)
- `onRelease(dx)` returns `'commit-left' | 'commit-right' | 'rebound'` (was `'commit' | 'rebound'`)
- Threshold check uses `Math.abs(dx) >= threshold`; sign of `dx` determines direction

One factory handles both gestures. Existing swipe-state tests for `onRelease` must be updated (`'commit'` → `'commit-left'`) and new rightward cases added.

### Green colour

Use Tailwind `bg-green-500` / `text-green-500` — no new CSS custom property needed. A semantic `--success` token can be introduced later if the design system requires it.

## Implementation notes

- **`swipe-state.ts`**: update `onMove` clamp and `onRelease` return type/logic
- **`EntryRow`**: `startCommit()` splits into `startCommitLeft()` (existing delete flow) and `startCommitRight()` (toggle `done` + snap back). The right-side reveal div is anchored to the left edge of the row (opposite of the delete background).
- **`swipe-state.test.ts`**: update `'commit'` → `'commit-left'` in existing tests; add rightward threshold/rebound cases

## Acceptance criteria

- [ ] `swipe-state` extended: `onMove` clamps to `[−rowWidth, +rowWidth]`, `onRelease` returns `'commit-left' | 'commit-right' | 'rebound'`
- [ ] Swiping right past threshold reveals a green background + checkmark icon + contextual label
- [ ] Label is "Done" (todo) or "Reviewed" (note/idea) when `done === false`
- [ ] Label is "Undo Done" (todo) or "Undo Reviewed" (note/idea) when `done === true`
- [ ] Releasing past threshold calls `entries-store.update(id, { done: !entry.done })` and snaps row back to center (~300ms ease-out)
- [ ] Swipe below threshold rebounds elastically (unchanged behaviour)
- [ ] `done === true` entries render with `line-through` + `opacity-60` on `displayText`; opacity fades in as row snaps back
- [ ] Swiping right again on a done entry toggles it back to `done === false`
- [ ] Rows remain visible in the list after being marked done
- [ ] `swipe-state` tests updated and passing; rightward commit/rebound cases covered

## Blocked by

- #5 (EntryRow component and swipe util)
