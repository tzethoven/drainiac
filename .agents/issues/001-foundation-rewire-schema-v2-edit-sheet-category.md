# Foundation rewire — schema v2 + EditSheet absorbs category

## Parent

PRD: `.agents/prd/polish-captured-recordings.md` (TBD — design decisions
captured in conversation; PRD will be authored alongside this slice or
shortly after).

## What to build

Lay the foundation for the Polish feature without shipping any AI
behaviour yet. Three tightly-related changes delivered together so the
app remains coherent after each commit:

1. **Entry schema v1 → v2.** Add four new nullable fields to the `Entry`
   type — `polishedText`, `polishedAt`, `polishedModel`,
   `polishedPromptVersion` — all defaulting to `null` on existing
   entries. Bump `schemaVersion` from `1` to `2`.

2. **Pure migration + eager persist.** Introduce a pure
   `migrate(raw: unknown): Entry` function that dispatches on
   `schemaVersion` and upgrades v1 entries to v2 by filling the four new
   fields with `null`. `entriesStore`'s initial load runs every stored
   entry through `migrate` and **eagerly persists** the migrated array
   back to localStorage in a single write, so storage and the in-memory
   store are consistently v2-shaped from that point on. The migration
   module is designed to accept future `vN → vN+1` steps without
   restructuring.

3. **Display-precedence helper + UI rewire.** Introduce a pure
   `effectiveText(entry)` helper that returns
   `entry.polishedText ?? entry.displayText`. Replace direct
   `entry.displayText` reads with `effectiveText(entry)` at every
   user-facing site (inbox row rendering, edit sheet seed value, copy
   paths, search if applicable). The `EditSheet`'s text input is seeded
   from `effectiveText(entry)`, not `displayText`.

4. **Gesture / sheet rewire.** The category picker currently lives in
   `MenuSheet`, which is opened by long-press on an inbox row. Move the
   category picker into `EditSheet` (opened by tap). Delete `MenuSheet`
   and its long-press wiring. Long-press becomes a **no-op** for now —
   the handler remains in place but calls nothing. This clears the
   runway for slice #2 to attach polish to long-press without further
   UX churn.

No AI code, no server route, no new env vars in this slice.

## Acceptance criteria

- [ ] `Entry` type has `polishedText: string | null`,
      `polishedAt: number | null`, `polishedModel: string | null`,
      `polishedPromptVersion: number | null`, and `schemaVersion: 2`.
- [ ] `CONTEXT.md` glossary is updated to reflect `schemaVersion: 2`
      and introduces the four new fields, plus the `effectiveText`
      helper and its precedence rule. (Per CONTEXT.md's own invariant:
      define the term here first, then use it in code.)
- [ ] A pure `migrate(raw): Entry` function exists, handles a v1
      fixture, and returns a well-formed v2 entry with the four new
      fields set to `null`. Unknown `schemaVersion` values throw or log
      and skip (decision documented in the function's behaviour; align
      with existing store patterns).
- [ ] `entriesStore`'s initial load invokes `migrate` on every stored
      entry and, if any entry was upgraded, writes the migrated array
      back to localStorage in a single `setItem` call before returning
      control. Subsequent loads are no-ops.
- [ ] A pure `effectiveText(entry)` helper is exported and used at every
      user-facing read site. Greppable: no remaining direct reads of
      `entry.displayText` for rendering or edit-seed purposes.
- [ ] `EditSheet`'s text input is pre-filled with
      `effectiveText(entry)`.
- [ ] `EditSheet` contains the category picker (three options: todo /
      note / idea) previously found in `MenuSheet`. Changing category
      from within `EditSheet` persists through the existing
      `entriesStore.update` path.
- [ ] `MenuSheet.svelte` is deleted. All imports and references are
      removed. The inbox still type-checks and builds.
- [ ] `EntryRow`'s long-press handler is retained structurally (for
      slice #2 to attach to) but does nothing user-visible in this
      slice. The existing haptic/pulse feedback is removed or left
      dormant — pick one and document it in the PR.
- [ ] No regressions: capture → inbox → tap-to-edit → save / delete /
      swipe-done still work end-to-end.
- [ ] Tests:
  - [ ] `entriesMigrations` — v1 fixture → v2 entry; idempotency (v2
        in → v2 out unchanged); malformed input behaviour matches the
        chosen contract.
  - [ ] `entriesStore` — loading a v1-shaped localStorage blob results
        in v2 entries in the store **and** a v2-shaped blob in
        storage after load. Extends existing `entries-store.test.ts`
        style.
  - [ ] `EditSheet` — renders with input pre-filled from
        `effectiveText(entry)`; category change from within the sheet
        dispatches the expected update.
  - [ ] `effectiveText` — covered implicitly via callers; no dedicated
        test needed (pure one-liner).
- [ ] `npm run lint` and `npm run test` pass. `npm run build` succeeds.

## Non-goals (explicitly deferred to later slices)

- Any call to Gemini or any AI behaviour.
- Any change to `polishedText` beyond defaulting it to `null`.
- Long-press doing anything user-visible.
- "Revert to original" button (slice #3).
- Error taxonomy / toasts for polish (slice #4).

## Blocked by

None — can start immediately.
