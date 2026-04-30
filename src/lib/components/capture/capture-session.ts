/**
 * Capture Session — pure finite state machine.
 *
 * Owns the end-to-end lifecycle of one Capture attempt: from the user
 * pressing the mic button through to exactly one terminal outcome (Entry
 * saved or not, toast shown or not). See `CONTEXT.md` → "Capture Session"
 * and ADR-0001 for the why.
 *
 * This module is deliberately framework-free:
 *   - no Svelte, no DOM, no timers, no I/O.
 *   - `reduce(state, event) → { state, effects }` is sync and deterministic.
 *   - invariants #3, #5, #6 are structurally enforced by the state graph.
 *
 * The Svelte adapter (`capture-session.svelte.ts`) wires real I/O:
 * subscribes to `SpeechController` (translating its reactive state into
 * events) and executes emitted effects against the entries/toast stores
 * and an injected scheduler.
 */

import type { SpeechErrorCode } from "$lib/utils/speech-controller";
import type { ParsedEntry } from "$lib/utils/transcript-parser";
import { parse } from "$lib/utils/transcript-parser";
import {
  capturePolicy,
  type CaptureEndReason,
  type CapturePolicyResult,
} from "./capture-policy";

export type SessionPhase = "idle" | "recording" | "saved-visible" | "denied";

export interface SessionState {
  phase: SessionPhase;
  /** Accumulated partial transcript from the current session. Empty outside `recording`. */
  partialText: string;
  /** Latest speech error observed during the current `recording`. */
  lastErrorCode: SpeechErrorCode | null;
  /** `displayText` of the most recently saved Entry, shown during `saved-visible`. */
  lastSavedDisplayText: string | null;
}

export type SessionEvent =
  // --- from the pane (pointer handlers) ---
  | { type: "holdStart" }
  | { type: "holdRelease" }
  | { type: "holdSlideCancel" }
  | { type: "pointerInterrupted" }
  // --- from the speech controller subscription ---
  | { type: "speechTranscriptChanged"; text: string }
  | { type: "speechErrored"; code: SpeechErrorCode }
  | { type: "speechDenied" }
  // --- effect-then-event: dispatched by the adapter after running `saveEntry` ---
  | { type: "entrySaved" }
  // --- from the scheduler ---
  | { type: "finalDisplayTimerElapsed" };

export type SessionEffect =
  | { type: "startSpeech" }
  | { type: "cancelSpeech" }
  | { type: "saveEntry"; parsed: ParsedEntry; warning: boolean }
  | { type: "showToast"; message: string }
  | { type: "scheduleFinalTimer" }
  | { type: "cancelFinalTimer" };

export interface ReduceResult {
  state: SessionState;
  effects: SessionEffect[];
}

export function initialState(): SessionState {
  return {
    phase: "idle",
    partialText: "",
    lastErrorCode: null,
    lastSavedDisplayText: null,
  };
}

export function reduce(state: SessionState, event: SessionEvent): ReduceResult {
  switch (state.phase) {
    case "idle":
      return reduceIdle(state, event);
    case "recording":
      return reduceRecording(state, event);
    case "saved-visible":
      return reduceSavedVisible(state, event);
    case "denied":
      return noop(state);
  }
}

// --- phase reducers ---

function reduceIdle(state: SessionState, event: SessionEvent): ReduceResult {
  switch (event.type) {
    case "holdStart":
      return {
        state: {
          phase: "recording",
          partialText: "",
          lastErrorCode: null,
          lastSavedDisplayText: null,
        },
        effects: [{ type: "startSpeech" }],
      };
    case "speechDenied":
      return { state: { ...state, phase: "denied" }, effects: [] };
    default:
      return noop(state);
  }
}

function reduceRecording(
  state: SessionState,
  event: SessionEvent,
): ReduceResult {
  switch (event.type) {
    case "speechTranscriptChanged":
      return { state: { ...state, partialText: event.text }, effects: [] };

    case "speechErrored":
      // Don't terminate early. Stash the code; end-reason derivation on
      // release/interrupt will pick it up. Prevents mid-hold silence timeouts
      // and pre-warm aborts from prematurely committing a partial.
      return { state: { ...state, lastErrorCode: event.code }, effects: [] };

    case "speechDenied":
      // Invariant #5: sticky, silent. The in-flight hold is discarded.
      return {
        state: { ...state, phase: "denied", partialText: "" },
        effects: [{ type: "cancelSpeech" }],
      };

    case "holdSlideCancel":
      // User chose to discard. No save, no toast.
      return {
        state: { ...initialState() },
        effects: [{ type: "cancelSpeech" }],
      };

    case "holdRelease":
      // Adapter has already awaited controller.stop(); mic is quiescent.
      return applyTermination(state, deriveEndReason(state), {
        micNeedsCancel: false,
      });

    case "pointerInterrupted":
      // ADR-0002: OS interruption → aborted end-reason through the normal
      // policy. Mic is still live; the reducer must cancel it. Partial has
      // been accumulated in state via speechTranscriptChanged, so the
      // policy has everything it needs.
      return applyTermination(state, "aborted", { micNeedsCancel: true });

    case "entrySaved":
      return {
        state: {
          phase: "saved-visible",
          partialText: "",
          lastErrorCode: null,
          lastSavedDisplayText: state.lastSavedDisplayText,
        },
        effects: [{ type: "scheduleFinalTimer" }],
      };

    default:
      return noop(state);
  }
}

function reduceSavedVisible(
  state: SessionState,
  event: SessionEvent,
): ReduceResult {
  switch (event.type) {
    case "finalDisplayTimerElapsed":
      return { state: initialState(), effects: [] };

    case "holdStart":
      // Re-hold during the display window: cancel the timer and start fresh.
      return {
        state: {
          phase: "recording",
          partialText: "",
          lastErrorCode: null,
          lastSavedDisplayText: null,
        },
        effects: [{ type: "cancelFinalTimer" }, { type: "startSpeech" }],
      };

    case "speechDenied":
      return {
        state: { ...initialState(), phase: "denied" },
        effects: [{ type: "cancelFinalTimer" }],
      };

    default:
      return noop(state);
  }
}

// --- shared termination path (used by holdRelease and pointerInterrupted) ---

function applyTermination(
  state: SessionState,
  endReason: CaptureEndReason,
  opts: { micNeedsCancel: boolean },
): ReduceResult {
  const result: CapturePolicyResult = capturePolicy(endReason, state.partialText);
  const effects: SessionEffect[] = [];

  if (opts.micNeedsCancel) effects.push({ type: "cancelSpeech" });

  if (result.save) {
    const parsed = parse(state.partialText);
    effects.push({ type: "saveEntry", parsed, warning: result.warning });
    if (result.toast) effects.push({ type: "showToast", message: result.toast });
    // Stay in `recording` until `entrySaved` arrives. The adapter dispatches
    // it synchronously today (see ADR-0001 "effect-then-event"); when storage
    // goes async this gives us a natural place to insert a `saving` phase.
    return {
      state: { ...state, lastSavedDisplayText: parsed.displayText },
      effects,
    };
  }

  // Discard path.
  if (result.toast) effects.push({ type: "showToast", message: result.toast });
  return { state: initialState(), effects };
}

// --- helpers ---

function deriveEndReason(state: SessionState): CaptureEndReason {
  return state.lastErrorCode ?? "release";
}

function noop(state: SessionState): ReduceResult {
  return { state, effects: [] };
}

