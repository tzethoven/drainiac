# 07 — Tap-to-edit + long-press category menu

**Type:** AFK
**Parent PRD:** `.agents/prd/v1-mvp-voice-capture-inbox.md`
**Covers user stories:** 23, 24, 38, 39

## What to build

Two more `EntryRow` interactions, each opening a bottom sheet:

1. **Tap → `EditSheet`** — opens with the row's `displayText` pre-filled in a textarea. Save updates `displayText` and bumps `updatedAt`. Persists immediately.
2. **Long-press → `MenuSheet`** — opens a menu with "Change category" offering `Todo`, `Note`, `Idea` (excluding the current one). Selecting updates `category` and `updatedAt`. The row re-filters under the new chip immediately.

Both sheets use the existing dark styling tokens from `app.css`. Dismissed by backdrop tap, swipe-down on the drag handle, or Escape.

## Design

### Gesture layer

New pure module `src/lib/components/inbox/gesture-state.ts` that replaces/extends the current `swipe-state.ts` usage in `EntryRow`. Owns the full tap / long-press / swipe decision tree.

- **Thresholds:** 8 px movement, 500 ms long-press.
- **Scheduler injection:** constructor accepts `(ms, cb) => cancelFn` so tests run without fake timers. Real code passes `setTimeout` / `clearTimeout`.
- **Emitted events:** `"tap" | "long-press" | "commit-left" | "commit-right" | "rebound"`.
- **Cancels pending long-press on:** movement past 8 px, pointerup, pointercancel.
- **Post-long-press behavior:** swallow further move/up until pointerup; reset `translateX` to 0 (absorb 0–7 px of drift). No swipe can start once long-press has fired.
- **On long-press fire:** `EntryRow` calls `navigator.vibrate(10)` (no-op on iOS) and toggles a ~120 ms `scale-[0.98]` pulse class on the row content.

### Text normalization

New util `src/lib/utils/edit-text.ts`:

```ts
export function normalizeEditText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}
export function isBlank(input: string): boolean {
  return normalizeEditText(input).length === 0;
}
```

`transcript-parser.cleanBody` is **not** changed — the voice path keeps capitalize + forced period. Edit is literal.

### Sheet architecture

Shared primitive + two thin consumers.

**`src/lib/components/ui/BottomSheet.svelte`** — dumb shell, no domain knowledge.

- Props:
  ```ts
  interface Props {
    open: boolean;
    onClose: () => void;
    labelledBy?: string;
    children: Snippet;
  }
  ```
- Animation: Svelte `fly` on the panel + `fade` on the backdrop. Open 220 ms ease-out, close 180 ms ease-in.
- Backdrop: `fixed inset-0 bg-black/50`, click → `onClose`.
- Drag-handle swipe-down dismiss: small ~36×4 px pill at the top of the panel is the only drag-dismiss region (avoids fighting textarea selection/scroll). Threshold: drag down past ~80 px → dismiss; otherwise snap back. Reuse the `swipe-state` pattern.
- Body scroll-lock: `document.body.style.overflow = "hidden"` on mount, restore on unmount. Skip the iOS `position: fixed` hack for MVP (target is PWA standalone); revisit in issue #9 if needed.
- Focus management: on open, autofocus the first interactive element (textarea for Edit, first button for Menu). Capture `document.activeElement` at open time; restore focus on close. **No full focus trap** for MVP — flag as follow-up.
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the consumer's header id (EditSheet uses a visually-hidden "Edit entry" label).
- Escape key: `window` keydown listener added on open, removed on close.

**`src/lib/components/inbox/EditSheet.svelte`** — consumes `BottomSheet`.

- Textarea, `rows={3}`, wraps. No horizontal-scroll input.
- Autofocus on open; caret placed at end of existing text (`selectionStart = selectionEnd = value.length`).
- Enter = newline (textarea default). No Cmd/Ctrl+Enter shortcut.
- Cancel (left, ghost) + Save (right, accent) row at the bottom of the sheet.
- Save disabled when `isBlank(input)`.
- On Save:
  - If `normalizeEditText(input) === entry.displayText` → close without calling `update` (no-op short-circuit; preserves `updatedAt` semantics).
  - Otherwise → `store.update(entry.id, { displayText: normalizeEditText(input) })`; close.
- Cancel / backdrop / Escape / swipe-down → discard changes.
- `rawTranscript` never mutated. Category not re-parsed.
- No character limit.

**`src/lib/components/inbox/MenuSheet.svelte`** — consumes `BottomSheet`.

- Header: muted "Change category" label (becomes the `aria-labelledby` target).
- Two full-width rows, iOS action-sheet style. Each row: existing `badge-{category}` chip + category name. Tap anywhere on the row selects.
- Fixed order: Todo, Note, Idea — minus the current category.
- Current category is omitted entirely (not shown disabled).
- No explicit Cancel row — backdrop / swipe-down / Escape only. Symmetric with `EditSheet`.
- On selection: `store.update(entry.id, { category: nextCategory })`; close.
- Internals structured so adding a second section later (e.g. Delete, Duplicate) is a ~10-line change, but no generic `sections[]` prop.

### State ownership

Sheet state lifted out of `EntryRow` into `InboxPane`:

```ts
let sheet = $state<
  | { kind: "none" }
  | { kind: "edit"; entry: Entry }
  | { kind: "menu"; entry: Entry }
>({ kind: "none" });
```

`EntryRow` gains two callback props: `onTap(entry)` and `onLongPress(entry)`. `InboxPane` wires them to set `sheet`, and renders at most one sheet based on `sheet.kind`. This naturally enforces "only one sheet open at a time" and keeps `EntryRow` focused on gestures + display.

### File layout

```
src/lib/
├── components/
│   ├── ui/
│   │   └── BottomSheet.svelte          (new)
│   └── inbox/
│       ├── EntryRow.svelte             (rewire to gesture-state)
│       ├── EditSheet.svelte            (new)
│       ├── MenuSheet.svelte            (new)
│       ├── gesture-state.ts            (new)
│       ├── gesture-state.test.ts       (new)
│       └── swipe-state.ts              (logic folded into gesture-state;
│                                        delete if no longer referenced)
└── utils/
    ├── edit-text.ts                    (new)
    └── edit-text.test.ts               (new)
```

## Implementation plan

Single PR, seven commits, each independently green:

1. `edit-text.ts` + tests.
2. `gesture-state.ts` + tests (pure module, scheduler-injected).
3. `BottomSheet.svelte` primitive.
4. `EditSheet.svelte`.
5. `InboxPane` sheet state + `EntryRow` rewire to `gesture-state` + tap → EditSheet wiring. **At this point tap-to-edit ships end-to-end.**
6. `MenuSheet.svelte` + long-press wiring + haptic + visual pulse.
7. Manual QA pass against AC checklist.

## Testing

Matching the repo's "test pure modules, trust the glue" posture.

- **`gesture-state.test.ts`** — mirrors `swipe-state.test.ts`. Cases: tap (down→up, no move, <500 ms), long-press (timer fires while still), swipe-left commit, swipe-right commit, swipe rebound, movement cancels pending long-press, pointercancel cancels pending long-press, post-fire swallow (move/up after long-press emit nothing further).
- **`edit-text.test.ts`** — `normalizeEditText` (trim, collapse internal whitespace, leave single-internal-space alone); `isBlank` on `""`, `"   "`, `"\n\t"`, `"x"`.
- **`entries-store.test.ts`** — audit; add cases if missing for `update({ displayText })` and `update({ category })` both bumping `updatedAt` and persisting.

Component tests (`BottomSheet`, `EditSheet`, `MenuSheet`, `EntryRow` gesture wiring) are **deferred** — no harness precedent in the repo; Playwright acceptance in issue #9 will cover end-to-end. Revisit harness setup as its own issue after #9.

## Acceptance criteria

- [ ] `gesture-state.ts` emits `tap` / `long-press` / `commit-left` / `commit-right` / `rebound` with 8 px + 500 ms thresholds; pure with injected scheduler; unit-tested.
- [ ] `edit-text.ts` exports `normalizeEditText` + `isBlank`; unit-tested.
- [ ] `BottomSheet.svelte` primitive: fly+fade, drag-handle swipe-down dismiss, backdrop-tap dismiss, Escape dismiss, body scroll-lock, autofocus + focus-return, `role="dialog"` + `aria-modal` + `aria-labelledby`.
- [ ] `EditSheet` component: bottom sheet with textarea, Save, Cancel.
- [ ] Tap on row opens `EditSheet` with current `displayText`, caret at end.
- [ ] Save calls `entries-store.update`, bumps `updatedAt`, persists to localStorage immediately.
- [ ] Save disabled when input is blank (after `normalizeEditText`).
- [ ] Save short-circuits (no `update` call) when normalized input equals current `displayText`.
- [ ] Cancel, backdrop tap, swipe-down, or Escape discards changes.
- [ ] `MenuSheet` component: bottom sheet listing the two alternative categories in Todo→Note→Idea order (current omitted).
- [ ] Long-press on row opens `MenuSheet` after 500 ms; triggers `navigator.vibrate(10)` + ~120 ms visual pulse on fire.
- [ ] Selecting a category updates the entry; if a category filter chip is active, the row visibly moves out of the current filter view.
- [ ] Tap, long-press, and swipe left/right are mutually exclusive and don't interfere (enforced by `gesture-state`).
- [ ] `rawTranscript` is never mutated by either flow.
- [ ] Category is never re-parsed from edited `displayText`.
- [ ] Sheet state lives in `InboxPane` as a discriminated union; only one sheet can be open at a time.

## Blocked by

- #5 (EntryRow infrastructure)

## Follow-ups (out of scope)

- Full focus trap inside `BottomSheet`.
- Component-test harness (`@testing-library/svelte` for Svelte 5).
- iOS `position: fixed` scroll-lock hack (revisit in #9 if needed).
- Additional `MenuSheet` sections (Delete, Duplicate, etc.).
