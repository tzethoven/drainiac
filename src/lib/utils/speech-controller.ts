/**
 * SpeechController — event-stream interface over the Web Speech keep-alive
 * engine.
 *
 * Owns the **filtering policy** on top of `speech-engine`'s raw callbacks:
 *   - maps raw error strings to `SpeechErrorCode`;
 *   - swallows teardown noise after a self-initiated stop()/cancel();
 *   - swallows pre-warming errors fired while not collecting;
 *   - enforces sticky `permission-denied` (start() is a no-op thereafter);
 *   - consolidates interim + final transcripts into a single de-duplicated
 *     `transcript` event (the engine already handles the mobile-Chrome
 *     cumulative-slot quirk below us).
 *
 * The controller has no Svelte or DOM coupling. Consumers subscribe via
 * `subscribe(handler)` and drive the lifecycle with `start` / `stop` /
 * `cancel`. `stop()` resolves after the engine has flushed trailing finals
 * (with a 500 ms safety timeout), so awaiting it guarantees every
 * `transcript` event for the session has been delivered.
 *
 * Subscribe **before** calling `start()` — events are not replayed to late
 * subscribers.
 */

import { createSpeechEngine } from "./speech-engine";
import type { SpeechRecognitionLike } from "./speech-engine";
import { debugLog } from "./debug-log";

export type SpeechErrorCode =
  | "no-speech"
  | "network"
  | "aborted"
  | "audio-capture"
  | "unknown";

export type SpeechEvent =
  | { type: "transcript"; text: string }
  | { type: "error"; code: SpeechErrorCode }
  | { type: "permission-denied" };

export interface SpeechController {
  readonly isSupported: boolean;
  subscribe(handler: (event: SpeechEvent) => void): () => void;
  start(): void;
  /**
   * Stop the current recording. Resolves once the engine has flushed
   * trailing `transcript` events (or after a 500 ms safety timeout if
   * `onend` never fires). No-op when unsupported or sticky-denied.
   */
  stop(): Promise<void>;
  cancel(): void;
}

export interface SpeechControllerOptions {
  recognitionFactory?: () => SpeechRecognitionLike;
  /** BCP-47 language tag, e.g. `en-GB`. Defaults to `navigator.language` at runtime. */
  lang?: string;
}

export function createSpeechController(
  options: SpeechControllerOptions = {},
): SpeechController {
  // --- subscriber registry ---------------------------------------------
  const handlers = new Set<(event: SpeechEvent) => void>();
  function emit(event: SpeechEvent): void {
    // debugLog("controller:emit", event);
    for (const h of handlers) h(event);
  }

  // --- transcript consolidation ----------------------------------------
  let interimText = "";
  let finalText = "";
  let lastEmittedTranscript = "";

  function emitTranscript(): void {
    const text = (finalText + interimText).trim();
    if (text === lastEmittedTranscript) return;
    lastEmittedTranscript = text;
    emit({ type: "transcript", text });
  }

  function resetTranscript(): void {
    interimText = "";
    finalText = "";
    lastEmittedTranscript = "";
  }

  // --- filtering state -------------------------------------------------
  /** True between start() and stop()/cancel() / fatal error. Gates pre-warm noise. */
  let collecting = false;
  /** Sticky: once true, start() is a no-op for the lifetime of the controller. */
  let permissionDenied = false;
  /** True when the next 'aborted'/error is caused by our own stop()/cancel(). */
  let selfInitiatedAbort = false;
  /** Resolver for the current in-flight stop() promise. */
  let pendingStopResolve: (() => void) | null = null;
  let pendingStopTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // --- recognition factory resolution ----------------------------------
  const factory = resolveFactory(options);
  const isSupported = factory !== null;

  function mapRawError(raw: string): SpeechErrorCode | "permission-denied" {
    switch (raw) {
      case "not-allowed":
      case "service-not-allowed":
        return "permission-denied";
      case "no-speech":
      case "network":
      case "aborted":
      case "audio-capture":
        return raw;
      default:
        return "unknown";
    }
  }

  const engine = factory
    ? createSpeechEngine({
        recognitionFactory: factory,
        onStopped() {
          if (pendingStopTimeoutId !== null) {
            clearTimeout(pendingStopTimeoutId);
            pendingStopTimeoutId = null;
          }
          const resolve = pendingStopResolve;
          pendingStopResolve = null;
          resolve?.();
        },
        onInterim(text) {
          // debugLog("controller:onInterim", { incomingText: text });
          interimText = text;
          emitTranscript();
        },
        onFinal(text) {
          // debugLog("controller:onFinal", { incomingText: text });
          finalText = text;
          interimText = "";
          emitTranscript();
        },
        onError(raw) {
          const mapped = mapRawError(raw);
          // debugLog("controller:onError", {
          //   raw,
          //   mapped,
          //   collecting,
          //   selfInitiatedAbort,
          // });
          // Any error after a self-initiated stop/cancel is teardown noise
          // (spurious 'not-allowed' / 'aborted' that Chrome sometimes emits
          // during Web Speech API session teardown).
          if (selfInitiatedAbort) return;

          if (mapped === "permission-denied") {
            if (permissionDenied) return; // already sticky, don't double-emit
            permissionDenied = true;
            collecting = false;
            emit({ type: "permission-denied" });
            return;
          }

          // Pre-warming noise: engine fires no-speech/network/etc. between
          // user holds. Swallow unless we're actively collecting for a caller.
          if (!collecting) return;

          emit({ type: "error", code: mapped });
        },
      })
    : null;

  // --- public surface --------------------------------------------------
  function start(): void {
    if (!engine) return;
    if (permissionDenied) return;
    selfInitiatedAbort = false;
    resetTranscript();
    collecting = true;
    engine.startCollecting();
  }

  function stop(): Promise<void> {
    if (!engine) return Promise.resolve();
    if (permissionDenied) return Promise.resolve();
    selfInitiatedAbort = true;
    collecting = false;
    engine.stopCollecting();
    if (pendingStopResolve) return Promise.resolve();
    return new Promise<void>((resolve) => {
      pendingStopResolve = resolve;
      // Safety timeout in case onend never fires.
      pendingStopTimeoutId = setTimeout(() => {
        pendingStopTimeoutId = null;
        const r = pendingStopResolve;
        pendingStopResolve = null;
        r?.();
      }, 500);
    });
  }

  function cancel(): void {
    if (!engine) return;
    if (permissionDenied) return;
    selfInitiatedAbort = true;
    collecting = false;
    resetTranscript();
    engine.cancelCollecting();
  }

  function subscribe(handler: (event: SpeechEvent) => void): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  return {
    get isSupported() {
      return isSupported;
    },
    subscribe,
    start,
    stop,
    cancel,
  };
}

function resolveFactory(
  options: SpeechControllerOptions,
): (() => SpeechRecognitionLike) | null {
  if (options.recognitionFactory) return options.recognitionFactory;
  if (typeof window === "undefined") return null;
  const Ctor =
    (
      window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).SpeechRecognition ??
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }
    ).webkitSpeechRecognition;
  if (!Ctor) return null;
  const lang =
    options.lang ??
    (typeof navigator !== "undefined" ? navigator.language : "") ??
    "";
  return () => {
    const r = new Ctor();
    r.lang = lang;
    return r;
  };
}
