# ADR-0002: Slide-cancel and pointer-interrupted are distinct events

- **Status:** Accepted
- **Date:** 2026-04-30

## Context

A Capture Session can end without a deliberate `holdRelease` in two
structurally similar but semantically different ways:

1. **Slide-cancel** — the user slid their finger up past the cancel
   threshold and released. They are saying "discard this; I changed my
   mind."
2. **Pointer-interrupted** — the browser fired `pointercancel` because
   the OS took the pointer (phone call, app switch, tab backgrounded).
   The user did not choose to stop.

Both look like "the user didn't finish normally." A future refactor may
be tempted to unify them as a single "non-release termination."

## Decision

Keep them as two separate events in the Capture Session FSM:

- `holdSlideCancel` → discard the partial transcript, no save, no toast,
  `recording → idle`.
- `pointerInterrupted` → run the Capture Policy with
  `endReason: "aborted"`. Per invariant #6, this **saves** the partial
  with **no warning** (the user's thought was cut short, not the
  transcription).

## Consequences

**Positive**

- **Invariant #6 is preserved.** The asymmetry between "user chose to
  discard" and "OS cut them off" is load-bearing for the product
  promise ("capture is sacred" — a phone call mid-thought should not
  lose the thought).
- Removes the force-save branch that existed in `CapturePane.cancelHold`
  to work around `controller.cancel()` having already discarded the
  buffer. The session accumulates `partialText` in its own state via
  `speechTranscriptChanged` events, so the policy can run after the
  mic is cancelled.

**Negative**

- Two events to reason about where structurally one termination is
  occurring. Mitigated by both events being dispatched from distinct
  pointer handlers (`pointerup` with `isCancelling` vs
  `pointercancel`), so the distinction is never ambiguous in practice.

## Alternatives considered

- **Unify under a single `sessionEnded(reason)` event.** Rejected:
  callers would immediately re-introduce the distinction via the
  reason field, and the invariant would rely on convention rather
  than the event shape.

## Re-visit when

- The UX contract for slide-cancel changes (e.g. user research shows
  people expect it to save-without-warning like pointer-interrupted).
  At that point invariant #6 needs to change too, and this ADR can be
  superseded.
