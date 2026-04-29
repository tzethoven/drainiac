/**
 * Gesture state machine for `EntryRow`: distinguishes tap, long-press, and
 * horizontal swipe from a single pointer stream.
 *
 * Pure module with an injected scheduler, mirroring the testability pattern
 * of `swipe-state.ts` and the `entries-store` options (`now`, `idFactory`).
 *
 * State flow:
 *
 *   idle
 *     ├── onDown            → pending  (schedule long-press timer)
 *   pending
 *     ├── onUp              → idle      [emit "tap"]
 *     ├── onMove past 8 px  → swiping  (cancel timer)
 *     ├── timer fires       → long-pressed [emit "long-press"]
 *     └── onCancel          → idle     (cancel timer, no emit)
 *   swiping
 *     ├── onMove            → swiping  (returns clamped translateX)
 *     ├── onUp (|dx| ≥ 40% rowWidth)  → idle [emit "commit-left" | "commit-right"]
 *     ├── onUp (below)      → idle     [emit "rebound"]
 *     └── onCancel          → idle     [emit "rebound"]
 *   long-pressed
 *     ├── onMove            → swallowed (returns 0)
 *     ├── onUp              → idle     (no emit)
 *     └── onCancel          → idle     (no emit)
 */

export type Scheduler = (ms: number, cb: () => void) => () => void;

export interface GestureCallbacks {
  onTap: () => void;
  onLongPress: () => void;
  onCommitLeft: () => void;
  onCommitRight: () => void;
  onRebound: () => void;
}

export interface GestureStateOptions {
  rowWidth: number;
  scheduler: Scheduler;
  callbacks: GestureCallbacks;
  /** Pixels of movement before a gesture counts as a swipe. Default: 8. */
  movementThreshold?: number;
  /** Long-press duration in ms. Default: 500. */
  longPressDuration?: number;
  /** Fraction of rowWidth required to commit a swipe. Default: 0.4. */
  swipeCommitRatio?: number;
}

export interface GestureState {
  onDown(x: number): void;
  onMove(x: number): number;
  onUp(x: number): void;
  onCancel(): void;
}

type Phase = "idle" | "pending" | "swiping" | "long-pressed";

export function createGestureState(options: GestureStateOptions): GestureState {
  const {
    rowWidth,
    scheduler,
    callbacks,
    movementThreshold = 8,
    longPressDuration = 500,
    swipeCommitRatio = 0.4,
  } = options;

  const commitThreshold = rowWidth * swipeCommitRatio;

  let phase: Phase = "idle";
  let startX = 0;
  let cancelTimer: (() => void) | null = null;

  function clearTimer() {
    if (cancelTimer) {
      cancelTimer();
      cancelTimer = null;
    }
  }

  function clamp(dx: number): number {
    return Math.max(-rowWidth, Math.min(rowWidth, dx));
  }

  return {
    onDown(x: number) {
      phase = "pending";
      startX = x;
      clearTimer();
      cancelTimer = scheduler(longPressDuration, () => {
        cancelTimer = null;
        // Only fire if still pending; defensive against stale timers.
        if (phase === "pending") {
          phase = "long-pressed";
          callbacks.onLongPress();
        }
      });
    },

    onMove(x: number): number {
      if (phase === "idle" || phase === "long-pressed") return 0;

      const dx = x - startX;

      if (phase === "pending") {
        if (Math.abs(dx) >= movementThreshold) {
          clearTimer();
          phase = "swiping";
          return clamp(dx);
        }
        return 0;
      }

      // phase === "swiping"
      return clamp(dx);
    },

    onUp(x: number) {
      if (phase === "idle") return;

      if (phase === "pending") {
        clearTimer();
        phase = "idle";
        callbacks.onTap();
        return;
      }

      if (phase === "long-pressed") {
        phase = "idle";
        return;
      }

      // phase === "swiping"
      const dx = x - startX;
      phase = "idle";
      if (dx <= -commitThreshold) {
        callbacks.onCommitLeft();
      } else if (dx >= commitThreshold) {
        callbacks.onCommitRight();
      } else {
        callbacks.onRebound();
      }
    },

    onCancel() {
      if (phase === "idle") return;
      clearTimer();
      const wasSwiping = phase === "swiping";
      phase = "idle";
      if (wasSwiping) callbacks.onRebound();
    },
  };
}
