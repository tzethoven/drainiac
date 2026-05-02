# Edit & revert semantics for polished entries

## Parent

PRD: `.agents/prd/polish-captured-recordings.md` (TBD).

## What to build

Now that entries can be polished (slice #2), close the loop on how the
user reshapes or undoes a polish. Two related behaviours, both scoped
to `EditSheet` and the store's update path.

### Save semantics

When the user taps Save in `EditSheet`, the outcome depends on how the
current input compares to the entry's current `polishedText`:

1. **Input is unchanged** (equals `effectiveText(entry)` — i.e. equals
   `polishedText` when set, else `displayText`). **No write at all.**
   No `updatedAt` bump, no `polishedText` clearing. The sheet closes
   silently. This is the "I opened it to re-read, not to edit"
   case; it must not silently destroy the user's polish.

2. **Input differs from the current `polishedText`** (and
   `polishedText` is set). Write
   `{ displayText: newText, polishedText: null, polishedAt: null,
   polishedModel: null, polishedPromptVersion: null, updatedAt: now }`.
   The four polish metadata fields all clear together. The user's edit
   is now the canonical display.

3. **Input differs and `polishedText` is not set.** Unchanged from
   existing behaviour: write `{ displayText: newText, updatedAt: now }`
   through the existing path.

The rule is expressible as a pure predicate on `(newText, entry)` and
should be factored out of the component into a testable helper
(e.g. `computeEditSave(newText, entry)` returning either `null` for
"no-op" or a partial Entry patch for "apply this update").

### Revert button

`EditSheet` shows a **"Revert to original"** button iff
`entry.polishedText != null`. Placement: inside the sheet's action
zone, visually distinct from Save (secondary / destructive-adjacent
styling — match existing conventions). Behaviour on tap:

- Directly patch the entry with
  `{ polishedText: null, polishedAt: null, polishedModel: null,
  polishedPromptVersion: null, updatedAt: now }` via the existing
  store update path.
- Close the sheet immediately. **Does not** go through the edit input
  — the label means what it says.
- No confirmation dialog. The action is non-destructive in the
  meaningful sense: `displayText` and `rawTranscript` are untouched,
  and the user can simply long-press again to re-polish.

After revert, the row renders `effectiveText` = `displayText` (the
cleanBody output or the user's last manual edit), and the static
Sparkles icon disappears.

## Acceptance criteria

- [ ] A pure `computeEditSave(newText, entry)` (or equivalently named)
      helper exists and encapsulates the three-case save logic. Its
      interface does not expose component or DOM concerns.
- [ ] `EditSheet` Save handler delegates to the helper and either
      no-ops or dispatches the returned patch via `entriesStore.update`.
- [ ] Opening `EditSheet`, making no changes, and tapping Save leaves
      the entry byte-identical — including `updatedAt` and all four
      polish fields.
- [ ] Editing text on a polished entry and saving clears all four
      polish fields and writes the new `displayText`.
- [ ] Editing text on a never-polished entry and saving behaves exactly
      as before slice #1.
- [ ] `EditSheet` renders a "Revert to original" button if and only if
      `entry.polishedText != null`.
- [ ] Tapping "Revert to original" clears the four polish fields,
      bumps `updatedAt`, closes the sheet, and does not open or
      consult the edit input.
- [ ] After revert, the inbox row renders `displayText` and the static
      Sparkles icon is gone.
- [ ] Long-press on a reverted entry works again (re-polishes).
- [ ] Tests:
  - [ ] `computeEditSave` — case 1 (unchanged) returns no-op; case 2
        (differs from polished) returns a patch that clears all four
        polish fields; case 3 (differs, never polished) returns a
        standard displayText patch. Pure function tests.
  - [ ] `EditSheet` — revert button only renders when
        `polishedText != null`; tapping it dispatches the expected
        patch and closes the sheet; Save no-ops when text is unchanged.
  - [ ] `entriesStore` — the update path correctly merges a polish-
        clearing patch (covered if existing tests already cover
        generic `update`, otherwise add one).
- [ ] `npm run lint`, `npm run test`, and `npm run build` pass.

## Non-goals

- Richer error taxonomy / toasts (slice #4).
- Confirmation dialogs for revert.
- Undoing a revert (long-press re-polishes; that's the undo).

## Blocked by

- Blocked by #2 (polish tracer)
