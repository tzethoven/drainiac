# 06 — Swipe-right done/reviewed + strike-through

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 20, 21

## What to build

Add the second `EntryRow` gesture: swipe-right toggles the universal `done` flag. Label is contextual — "Done" for todos, "Reviewed" for notes and ideas — but the underlying field and store call are the same.

Done/reviewed entries remain visible with strike-through styling so the user sees progress accumulate through the day. `Clear done` (from #04) is the sweep action.

## Acceptance criteria

- [ ] Swiping an `EntryRow` right past threshold toggles `done` via `entries-store.update` (bumps `updatedAt`)
- [ ] Action-background label reads "Done" for `category === 'todo'` and "Reviewed" for `note`/`idea`
- [ ] Swipe below threshold rebounds elastically
- [ ] `done === true` entries render with strike-through styling on `displayText`
- [ ] Strike-through transitions smoothly
- [ ] Swiping right again on a done entry toggles it back (un-done)
- [ ] Rows remain visible in the list after being marked done (not hidden)

## Blocked by

- #5 (EntryRow component and swipe util)
