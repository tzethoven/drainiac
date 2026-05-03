# Narrow the entries-store update seam — replace generic patch with intent-named ops

## Parent

Architecture review (improve-codebase-architecture, 2026-05-02).

## What to build

`entriesStore.update(id, patch)` is a **shallow** seam: it accepts any
subset of six user-visible fields plus the four polish-metadata fields,
with no enforcement of cross-field invariants. The "edit that diverges
from polish clears the polish quartet" invariant (CONTEXT.md, Entry
glossary) is maintained by a pure helper (`computeEditSave`) the
caller must remember to use, plus a `REVERT_POLISH_PATCH` constant for
the revert path. Nothing stops a caller from writing `displayText`
without clearing polish.

Replace the generic patch seam with intent-named operations that
structurally enforce the invariants.

### Scope

1. **New store operations.** Replace `update(id, patch)` with:

   ```ts
   interface EntriesStore {
     …
     editText(id: string, displayText: string): void;
     setCategory(id: string, category: Category): void;
     toggleDone(id: string): void;           // or setDone(id, done)
     revertPolish(id: string): void;
     // polish(id) and the internal applyPolishResult unchanged
   }
   ```

   `editText` owns the three-case logic currently in `computeEditSave`:
   - input normalizes to `effectiveText(entry)` → no-op, no write.
   - input differs and entry is polished → write new `displayText` +
     clear polish.
   - input differs and entry is unpolished → write `displayText` only.

   `setCategory` / `toggleDone` do not touch polish (changing category
   or done-state doesn't invalidate a polish).

   `revertPolish` clears polish only; `displayText` and `rawTranscript`
   untouched so a re-polish remains available.

2. **Pure helpers fold into the store.**
   - `computeEditSave` and `EditSavePatch` disappear as public API;
     the three-case logic moves inside `editText`.
   - `REVERT_POLISH_PATCH` disappears; `revertPolish` writes the
     polish-cleared state directly.
   - If #005 (grouped `Polish` field) has landed, both collapses are
     trivial one-liners.

3. **`EntryUpdatePatch` removed from the public API.** No caller
   constructs patches anymore. The type (or a renamed internal
   equivalent) may still exist privately in the store for the
   reducer, but it's not exported.

4. **Callers.**
   - `EditSheet.save()` → `store.editText(entry.id, value)` (blank
     guard stays in the component).
   - `EditSheet.chooseCategory()` → `store.setCategory(entry.id, …)`.
   - `EditSheet.revert()` → `store.revertPolish(entry.id)`.
   - `EntryRow.startCommitRight` → `store.toggleDone(entry.id)`.

5. **Tests.**
   - `edit-save.test.ts` moves its behavioural assertions into
     `entries-store.test.ts` as tests of `editText`. The three cases
     (no-op, polished-diverges, unpolished-diverges) each become a
     store test that exercises the full path including `updatedAt`
     stamping.
   - Delete `edit-save.ts` and `edit-save.test.ts` once the store
     tests cover the equivalent behaviour.
   - Existing store tests that use `store.update(id, { done: … })`
     etc. migrate to the new method names.

### Invariant preservation

- Invariant 9 (newest-first): unchanged; no operation re-sorts.
- Invariant 10 (schema bumps need migrations): unchanged.
- "Polish metadata set/cleared together": now enforced by the fact
  that no external caller can write `polishedText` (or `polish`) at
  all. The only writers are `applyPolishResult` (sets) and
  `revertPolish` + `editText`'s diverging branch (clears).

## Acceptance criteria

- [ ] `EntriesStore` exposes `editText`, `setCategory`, `toggleDone`,
      `revertPolish`. `update(id, patch)` is no longer part of the
      interface.
- [ ] `EntryUpdatePatch` is not exported from
      `entries-store.svelte.ts`.
- [ ] `EditSheet.svelte` and `EntryRow.svelte` call only the new
      intent-named methods. Grep confirms no `store.update(` usage in
      `src/`.
- [ ] `edit-save.ts` and `edit-save.test.ts` deleted (or the helper
      is strictly internal to the store module).
- [ ] `entries-store.test.ts` covers the three `editText` cases
      (no-op on equal-to-effective, polish-cleared on divergence,
      plain write on unpolished divergence) plus `revertPolish`
      clearing polish without touching `displayText` / `rawTranscript`.
- [ ] `updatedAt` is bumped exactly when a write happens (no-op case
      must not bump it).
- [ ] `polishingIds.delete(id)` is still called on any user-initiated
      mutation (editText that writes, setCategory, toggleDone,
      revertPolish, remove) — same "in-flight polish discarded on
      user action" invariant as today.
- [ ] CONTEXT.md Entry glossary updated to describe the intent-named
      seam rather than `update(patch)`.
- [ ] `npm run lint`, `npm run test`, `npm run build` pass.

## Non-goals

- Undo / redo plumbing — different problem.
- Bulk operations (`editMany`, batch category changes) — add when a
  UI need lands.
- Changing behaviour of `remove`, `restore`, `clearDone`, `add`.

## Blocked by

None structurally, but **ordering matters**:
- If #005 lands first, this slice is purely mechanical — polish
  clearing is `{ polish: null }` in one place.
- If this slice lands first, #005 only has to touch the store
  internals and the UI reads (no public patch-shape churn).

Either order is fine; do not land #005 and #007 in the same PR — the
diffs compose poorly for review.
