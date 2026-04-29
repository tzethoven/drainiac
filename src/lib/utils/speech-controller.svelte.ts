import { createSpeechEngine } from "./speech-engine";
import type { SpeechRecognitionLike } from "./speech-engine";
import { debugLog } from "./debug-log";

export type SpeechState =
  | "unsupported"
  | "permission-denied"
  | "idle"
  | "recording"
  | "error";

export type SpeechErrorCode =
  | "no-speech"
  | "network"
  | "aborted"
  | "audio-capture"
  | "unknown";

export interface SpeechController {
  readonly state: SpeechState;
  readonly interimText: string;
  readonly finalText: string;
  readonly error: SpeechErrorCode | null;
  start(): void;
  /**
   * Stop the current recording. Returns a promise that resolves once the
   * engine has flushed all trailing results (i.e. the Web Speech API's
   * asynchronous final result events have arrived). Awaiting this before
   * reading `finalText` / `interimText` avoids committing a stale snapshot.
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
  let state = $state<SpeechState>("idle");
  let interimText = $state("");
  let finalText = $state("");
  let error = $state<SpeechErrorCode | null>(null);
  /** True when the next 'aborted' event is caused by our own stop()/cancel(). */
  let selfInitiatedAbort = false;
  /** Resolver for the current in-flight stop() promise. */
  let pendingStopResolve: (() => void) | null = null;
  let pendingStopTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const resolveFactory = (): (() => SpeechRecognitionLike) | null => {
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
  };

  const factory = resolveFactory();
  if (!factory) {
    state = "unsupported";
  }

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

  // If the browser doesn't support SpeechRecognition, stay idle until start()
  // is called, at which point we surface the unsupported error.
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
          debugLog("controller:onInterim", {
            incomingText: text,
            prevFinal: finalText,
            prevInterim: interimText,
            state,
          });
          interimText = text;
        },
        onFinal(text) {
          debugLog("controller:onFinal", {
            incomingText: text,
            prevFinal: finalText,
            prevInterim: interimText,
            state,
          });
          finalText = text;
          interimText = "";
        },
        onError(err) {
          const mapped = mapRawError(err);
          debugLog("controller:onError", {
            raw: err,
            mapped,
            state,
            selfInitiatedAbort,
          });
          // Any error after a self-initiated stop/cancel is teardown noise
          // (spurious 'not-allowed' / 'aborted' that Chrome sometimes emits
          // during Web Speech API session teardown).
          if (selfInitiatedAbort) {
            return;
          }
          if (mapped === "permission-denied") {
            state = "permission-denied";
            error = null;
            return;
          }
          if (mapped === "aborted" && selfInitiatedAbort) {
            // Our own stop()/cancel() — state already set to idle, swallow.
            return;
          }
          if (state !== "recording") {
            // Pre-warming noise; user hasn't held the button.
            return;
          }
          error = mapped;
          state = "error";
        },
      })
    : null;

  function start() {
    if (!engine) return;
    if (state === "permission-denied") return;
    selfInitiatedAbort = false;
    error = null;
    interimText = "";
    finalText = "";
    state = "recording";
    engine.startCollecting();
  }

  function stop(): Promise<void> {
    if (!engine) return Promise.resolve();
    if (state === "permission-denied" || state === "unsupported") {
      return Promise.resolve();
    }
    selfInitiatedAbort = true;
    state = "idle";
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

  function cancel() {
    if (!engine) return;
    if (state === "permission-denied" || state === "unsupported") return;
    selfInitiatedAbort = true;
    interimText = "";
    finalText = "";
    state = "idle";
    engine.cancelCollecting();
  }

  return {
    get state() { return state; },
    get interimText() { return interimText; },
    get finalText() { return finalText; },
    get error() { return error; },
    start,
    stop,
    cancel,
  };
}
