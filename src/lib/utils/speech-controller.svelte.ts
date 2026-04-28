import { createSpeechEngine } from "./speech-engine";
import type { SpeechRecognitionLike } from "./speech-engine";

export type SpeechState = "idle" | "recording" | "error";

export interface SpeechController {
  readonly state: SpeechState;
  readonly interimText: string;
  readonly finalText: string;
  readonly error: string | null;
  start(): void;
  stop(): void;
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
  let error = $state<string | null>(null);

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

  // If the browser doesn't support SpeechRecognition, stay idle until start()
  // is called, at which point we surface the unsupported error.
  const engine = factory
    ? createSpeechEngine({
        recognitionFactory: factory,
        onInterim(text) {
          interimText = text;
        },
        onFinal(text) {
          finalText = text;
          interimText = "";
        },
        onError(err) {
          error = err;
          state = "error";
        },
      })
    : null;

  function start() {
    if (!engine) {
      error = "unsupported: SpeechRecognition is not available in this browser";
      state = "error";
      return;
    }
    error = null;
    interimText = "";
    finalText = "";
    state = "recording";
    engine.startCollecting();
  }

  function stop() {
    if (!engine) return;
    state = "idle";
    engine.stopCollecting();
  }

  function cancel() {
    if (!engine) return;
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
