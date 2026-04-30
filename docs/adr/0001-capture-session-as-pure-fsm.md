# ADR-0001: Capture Session is a pure FSM with a Svelte adapter

- **Status:** Accepted
- **Date:** 2026-04-30

## Context

A Capture Session (see `CONTEXT.md`) is the domain concept for "one
end-to-end attempt at turning a thought into an Entry." It has a small
but real state space: the user is idle, holding the button, viewing the
just-saved transcript, or locked out by denied permissions. It has
invariants — most importantly **invariant #3**: a session ends with
exactly one outcome (one Entry created or none, at most one toast).

Before this ADR the session was implicit: its state was scattered across
`CapturePane.svelte` as booleans (`isHolding`, `isFinalVisible`,
`sessionHandled`), its transitions were split between an `$effect`
watching `controller.state` and three pointer handlers, and its
invariants were enforced by ad-hoc guards. The pure-function
`capturePolicy()` was extracted for testability, but the bugs that
actually mattered (double-apply, force-save bypass on pointercancel,
error-during-hold being committed prematurely) lived in the wiring, not
the policy.

## Decision

Model the Capture Session as a **pure finite state machine** in
`src/lib/components/capture/capture-session.ts`:

- States: `idle | recording | saved-visible | denied`.
- Events and effects are plain discriminated unions.
- `reduce(state, event) → { state, effects }` is sync, deterministic,
  has no Svelte or DOM dependencies.

A thin Svelte adapter (`capture-session.svelte.ts`) wires a
`SpeechController`, `EntriesStore`, `ToastStore`, and an injected
scheduler to the reducer: subscriptions translate to events, emitted
effects translate to imperative calls.

`CapturePane.svelte` keeps pointer geometry (activePointerId,
slide-up-to-cancel) and rendering, and delegates all session behaviour
to the adapter.

## Consequences

**Positive**

- Invariant #3 is **structurally enforced**: re-entering `recording`
  requires a fresh `holdStart`; a second outcome from the same session
  is not representable in the reducer.
- The reducer is the test surface. The full 13-row policy table, the
  permission-denied-while-idle path, the mid-hold-error path, and the
  pointer-cancel-saves-as-aborted path are exercised with in-memory
  events and asserted effects — no DOM, no fake timers required for
  the core FSM (timers are injected for the 3 s display window).
- A future text-source Capture Session (invariant language in
  `CONTEXT.md` already covers `source: "voice" | "text"`) can reuse
  the same reducer with a different adapter.

**Negative**

- Three files instead of one: pure reducer, Svelte adapter, component.
  The indirection is real; it buys testability and the structural
  invariant, and matches the precedent set by
  `gesture-state.ts` + `EntryRow.svelte`.
- The reducer must be kept in sync with any new `SpeechErrorCode` or
  `CaptureEndReason`. The policy is already exhaustive over
  `CaptureEndReason`; the reducer stays exhaustive over events by
  convention and by test.

## Alternatives considered

- **Widen `speech-controller` to own the session.** Rejected: conflates
  microphone lifecycle with capture outcome, and would need re-doing
  for the planned text source.
- **Make the session a single `.svelte.ts` rune module without a pure
  reducer.** Rejected: invariant #3 would stay defended by booleans,
  and tests would need a Svelte runtime. Not worth the one-file saving.

## Re-visit when

- Storage becomes async and the UI needs a visible `saving` state.
  Today the reducer uses an **effect-then-event** pattern for saves
  (emit `saveEntry` effect, adapter dispatches `entrySaved` back
  immediately); adding a `saving` state is a localized change when
  `store.add` returns a Promise.
- A second Capture source lands (text composer). Confirm the reducer
  still fits; if the event set diverges meaningfully, consider
  parameterising or splitting.
