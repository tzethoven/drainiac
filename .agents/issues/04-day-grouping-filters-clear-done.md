# 04 — Day grouping + category filter chips + Clear done

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 16, 17, 22

## What to build

Upgrade the flat inbox list into grouped sections with a category filter and a bulk-clear action.

1. **`day-grouper`** — pure function `group(entries, now)` returning ordered sections labelled `Today`, `Yesterday`, a weekday name (within the last week), or a specific date string (older). Sections ordered newest-first; entries within a section ordered newest-first. Accepts `now` for deterministic testing.
2. **Filter chips** — a row pinned to the top of the inbox pane with `All | Todo | Note | Idea`. Tapping filters the list; grouping applies to the filtered set.
3. **Clear done** — a header button that calls `entries-store.clearDone()`.

## Acceptance criteria

- [ ] `day-grouper` module implemented as a pure function
- [ ] Tests cover: today → "Today"; yesterday → "Yesterday"; last-week-but-older-than-yesterday → weekday name; older → date string; empty input → empty section list; sections newest-first; entries newest-first within a section; midnight edge cases (23:59 prior vs. 00:01 today); `now` param respected
- [ ] Inbox pane renders grouped sections with section headers
- [ ] Filter chip row pinned to inbox pane top (remains visible while scrolling the inbox)
- [ ] Selecting a chip filters entries; grouping reapplies to the filtered set
- [ ] "Clear done" header button removes all `done === true` entries in one action
- [ ] All tests pass

## Blocked by

- #2 (entries-store and inbox pane)
