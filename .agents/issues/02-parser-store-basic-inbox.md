# 02 — Parser + persisted entries + basic inbox list

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 5, 6, 7, 8, 9, 10, 11, 35

## What to build

Turn raw transcripts into routed, cleaned, persisted entries and show them as a flat list below the capture pane. End-to-end: speak "todo buy milk" → release → scroll down → see a `todo` row reading "Buy milk."

Three modules and one minimal UI surface:

1. **`transcript-parser`** — pure `parse(raw)` returning `{ category, displayText, rawTranscript }`. Owns the alias map (canonical `todo`/`note`/`idea`; aliases `to do`, `to-do`, `task`, `notes`, `ideas`, `id`). Implements case-insensitive matching, leading-punctuation tolerance, two-word trigger handling, trigger stripping, cleaning rules (trim, capitalise first letter, terminal period, collapse whitespace), and default-to-note on no-match.
2. **`entries-store`** — rune-based reactive store backed by localStorage key `memento:entries`. Operations: `add`, `update`, `remove`, `clearDone`, plus reactive accessors for the full list and category-filtered views. All schema fields written on add.
3. **Wiring** — on release, `CapturePane` calls parser → store.add.
4. **Basic inbox list** — render entries below the capture pane (ungrouped, newest-first) with a category badge and `displayText`. No grouping, filtering, gestures, or scroll-snap yet.

## Entry schema (all fields written on add)

- `id: string` (locally generated)
- `schemaVersion: 1`
- `category: 'todo' | 'note' | 'idea'`
- `displayText: string`
- `rawTranscript: string` (immutable original from Web Speech, trigger word included)
- `source: 'voice' | 'text'` (always `'voice'` in v1)
- `done: boolean` (default `false`)
- `createdAt: number`
- `updatedAt: number`
- `processedAt?: number` (never written in v1)

## Acceptance criteria

- [ ] `transcript-parser` implemented with `parse()` public API
- [ ] Parser tests cover: each canonical trigger routes correctly; each alias resolves to its canonical; case-insensitivity; leading punctuation/whitespace; two-word `"to do"`; trigger stripped from `displayText`; no-match defaults to `note` with full text kept; each cleaning rule; `rawTranscript` equals input verbatim
- [ ] `entries-store` implemented with rune-based reactive API (`add`, `update`, `remove`, `clearDone`, reactive list + category-filtered reads)
- [ ] Store tests cover: add persists and is reactively readable; update bumps `updatedAt`; remove deletes; `clearDone` removes all `done === true` regardless of category; localStorage round-trip preserves all fields including absent `processedAt`; re-instantiating reads prior state; `schemaVersion: 1` written on every add
- [ ] `CapturePane` release handler: parser → store.add
- [ ] Below the capture pane, a flat list renders entries newest-first with category badge + displayText (plain scrollable list — scroll-snap comes later)
- [ ] Entries survive app reload
- [ ] All tests pass via `npm run test`

## Blocked by

- #1 (walking skeleton and speech-controller must exist)
