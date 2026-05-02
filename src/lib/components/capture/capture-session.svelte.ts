/**
 * Capture Session — Svelte adapter.
 *
 * Wires the pure `capture-session` reducer to real I/O:
 *   - subscribes to a `SpeechController` via $effect, translating its
 *     reactive state changes into session events;
 *   - runs emitted effects against an `EntriesStore`, a `ToastStore`,
 *     and an injected scheduler;
 *   - owns the `await controller.stop()` flush before dispatching
 *     `holdRelease` (see B4a / ADR-0001);
 *   - synchronously dispatches `entrySaved` after running a `saveEntry`
 *     effect (the effect-then-event pattern — see ADR-0001 for the
 *     async-storage motivation).
 *
 * The component (`CapturePane.svelte`) owns pointer geometry and
 * rendering only; it calls into this adapter for everything else.
 */

import type { SpeechController } from "$lib/utils/speech-controller";
import type { EntriesStore } from "$lib/stores/entries-store.svelte";
import type { ToastStore } from "$lib/stores/toast-store.svelte";
import { debugLog } from "$lib/utils/debug-log";
import {
  initialState,
  reduce,
  type SessionEffect,
  type SessionEvent,
  type SessionPhase,
  type SessionState,
} from "./capture-session";

export type Scheduler = (ms: number, cb: () => void) => () => void;

export interface CaptureSession {
  readonly phase: SessionPhase;
  /** Live transcript while `recording`; empty otherwise. */
  readonly liveTranscript: string;
  /** The just-saved Entry's displayText during `saved-visible`; null otherwise. */
  readonly finalDisplayText: string | null;

  holdStart(): void;
  /** Awaits the controller's trailing-final flush before dispatching. */
  holdRelease(): Promise<void>;
  holdSlideCancel(): void;
  pointerInterrupted(): void;
}

export interface CaptureSessionOptions {
  controller: SpeechController;
  entriesStore: EntriesStore;
  toastStore: ToastStore;
  /** Injected for tests. Default: window.setTimeout. */
  scheduler?: Scheduler;
  /** How long to keep the final transcript visible after a save. Default: 3000ms. */
  finalDisplayMs?: number;
}

const DEFAULT_FINAL_DISPLAY_MS = 3000;

export function createCaptureSession(
  options: CaptureSessionOptions,
): CaptureSession {
  const {
    controller,
    entriesStore,
    toastStore,
    scheduler = defaultScheduler,
    finalDisplayMs = DEFAULT_FINAL_DISPLAY_MS,
  } = options;

  let state = $state<SessionState>(initialState());
  let cancelFinalTimer: (() => void) | null = null;

  function dispatch(event: SessionEvent): void {
    // debugLog("session:dispatch", { event, prev: state.phase });
    const { state: next, effects } = reduce(state, event);
    state = next;
    for (const fx of effects) runEffect(fx);
  }

  function runEffect(fx: SessionEffect): void {
    // debugLog("session:effect", fx);
    switch (fx.type) {
      case "startSpeech":
        controller.start();
        return;

      case "cancelSpeech":
        controller.cancel();
        return;

      case "saveEntry": {
        entriesStore.add({
          category: fx.parsed.category,
          displayText: fx.parsed.displayText,
          rawTranscript: fx.parsed.rawTranscript,
          ...(fx.warning ? { warning: "partial-transcription" as const } : {}),
        });
        // Effect-then-event: synchronously inform the reducer that the save
        // completed so it can transition to `saved-visible`. When storage
        // goes async, this dispatch moves into the awaited callback and a
        // `saving` phase can be added in between.
        dispatch({ type: "entrySaved" });
        return;
      }

      case "showToast":
        toastStore.show(fx.message);
        return;

      case "scheduleFinalTimer": {
        if (cancelFinalTimer) cancelFinalTimer();
        cancelFinalTimer = scheduler(finalDisplayMs, () => {
          cancelFinalTimer = null;
          dispatch({ type: "finalDisplayTimerElapsed" });
        });
        return;
      }

      case "cancelFinalTimer":
        if (cancelFinalTimer) {
          cancelFinalTimer();
          cancelFinalTimer = null;
        }
        return;
    }
  }

  // --- controller subscription ------------------------------------------
  //
  // The controller exposes an event stream; we pipe each event directly
  // into the reducer. The reducer no-ops events that arrive outside the
  // phases that care about them (e.g. `speechTranscriptChanged` outside
  // `recording`), so no guarding is needed here.
  //
  // Subscribing inside `$effect` auto-unsubscribes on component teardown.

  $effect(() =>
    controller.subscribe((event) => {
      switch (event.type) {
        case "transcript":
          dispatch({ type: "speechTranscriptChanged", text: event.text });
          return;
        case "error":
          dispatch({ type: "speechErrored", code: event.code });
          return;
        case "permission-denied":
          dispatch({ type: "speechDenied" });
          return;
      }
    }),
  );

  // --- public surface ---------------------------------------------------

  return {
    get phase() {
      return state.phase;
    },
    get liveTranscript() {
      return state.phase === "recording" ? state.partialText : "";
    },
    get finalDisplayText() {
      return state.phase === "saved-visible"
        ? state.lastSavedDisplayText
        : null;
    },
    holdStart() {
      dispatch({ type: "holdStart" });
    },
    async holdRelease(): Promise<void> {
      // Wait for the engine to flush trailing finals. The
      // controller's stop() resolves once the Web Speech API has delivered
      // any final onresult that was in flight; reading synchronously drops
      // the last word.
      await controller.stop();
      dispatch({ type: "holdRelease" });
    },
    holdSlideCancel() {
      dispatch({ type: "holdSlideCancel" });
    },
    pointerInterrupted() {
      dispatch({ type: "pointerInterrupted" });
    },
  };
}

function defaultScheduler(ms: number, cb: () => void): () => void {
  const id = setTimeout(cb, ms);
  return () => clearTimeout(id);
}
