# Group the polish metadata quartet into a single `Polish` field

## Parent

Architecture review (improve-codebase-architecture, 2026-05-02).

## What to build

Replace the four parallel polish fields on `Entry`
(`polishedText`, `polishedAt`, `polishedModel`, `polishedPromptVersion`)
with a single optional value object:

```ts
interface Polish {
  text: string;
  at: number;          // was polishedAt
  model: string;       // was polishedModel
  promptVersion: number; // was polishedPromptVersion
}

interface Entry {
  …
  polish: Polish | null;
}
```

CONTEXT.md already declares the load-bearing invariant: "all four are
`null` when the entry has not been polished … always set together with
`polishedText` and cleared together on revert." Today that invariant is
enforced only by convention across at least five conspiring callsites.
Making it structural removes the possibility of ever having three of
four fields populated.

### Scope

1. **Schema bump: v2 → v3.** Add a migration step in
   `entries-migrations.ts` that collapses the four fields into
   `polish`. When any of the four is `null`/missing, emit `polish: null`
   (no partial states — they're all in lockstep in the stored data).
   Bump `CURRENT_SCHEMA_VERSION` and `Entry.schemaVersion`.

2. **Store.** `EntryUpdatePatch` loses its polish-field block (replaced
   by `polish?: Polish | null`). `applyPolishResult` writes
   `{ polish: { text, at, model, promptVersion } }`. The revert case
   writes `{ polish: null }`.

3. **Pure helpers.**
   - `effectiveText`: `entry.polish?.text ?? entry.displayText`.
   - `edit-save.ts`: `REVERT_POLISH_PATCH` collapses to `{ polish: null }`;
     `computeEditSave`'s polish-clearing branch collapses likewise.
   - `EditSavePatch` union shrinks.

4. **UI.** Every `entry.polishedText != null` check becomes
   `entry.polish != null`. `EntryRow`'s polished-sparkle branch and
   long-press guard; `EditSheet`'s `canRevert` derivation; any test
   fixtures.

5. **CONTEXT.md.** Update the **Entry** and **Polished Text** glossary
   entries to describe the grouped field. Keep the invariant wording
   ("set together, cleared together") — it's now structural, but
   explicitly noting that is useful for future reviewers.

### Not in scope

- Changing *when* polish is cleared (edit vs revert semantics are
  unchanged — slice #3 still applies).
- Renaming `polish` vs `polished` etc. in UI copy — internal-only change.
- Server-side types (`PolishResult` on the Gemini client) stay as-is;
  they already return the four components as a tuple-shaped object. The
  store maps the response into a `Polish` value when persisting.

## Acceptance criteria

- [ ] `Entry.polish: Polish | null` is the only polish-metadata shape
      on `Entry`. No `polishedText` / `polishedAt` / `polishedModel` /
      `polishedPromptVersion` fields exist anywhere in the client
      codebase.
- [ ] `schemaVersion: 3` is current. Migration v2 → v3 groups existing
      polished entries and preserves unpolished ones (`polish: null`).
- [ ] `entries-migrations.test.ts` covers:
  - [ ] v2 polished entry → v3 with `polish: { text, at, model, promptVersion }`.
  - [ ] v2 unpolished entry (four nulls) → v3 with `polish: null`.
  - [ ] Migration runs eagerly and persists (existing invariant).
- [ ] `effectiveText(entry)` logic is unchanged behaviourally; its
      implementation reads through `entry.polish?.text`.
- [ ] `REVERT_POLISH_PATCH` is `{ polish: null }` (or removed entirely
      if slice #007 lands first — see Blocked-by).
- [ ] `EntryUpdatePatch` no longer lists the four polish fields; it
      accepts `polish?: Polish | null` (or the operation disappears
      entirely if #007 lands first).
- [ ] All `entry.polishedText != null` checks rewritten to
      `entry.polish != null`. Grep confirms no stragglers.
- [ ] CONTEXT.md Entry + Polished Text entries updated.
- [ ] `npm run lint`, `npm run test`, `npm run build` pass.

## Non-goals

- Renaming `displayText` / `rawTranscript` — they are orthogonal and
  not part of the grouping.
- Introducing a `PolishState` enum ("idle" | "pending" | "polished")
  — that's a candidate for a future slice (see architecture review #4);
  `isPolishing` still lives on the store.

## Blocked by

None — can start immediately. Composes well with #007 (narrow update
seam): if #007 lands first, `EntryUpdatePatch` no longer carries polish
fields at all and this slice only touches the store-internal shape and
the UI reads. Either order works; call out in the PR which one is
landing first.
