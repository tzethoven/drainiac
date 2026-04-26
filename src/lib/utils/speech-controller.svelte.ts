/**
 * Minimal subset of the Web Speech API `SpeechRecognition` interface that the
 * controller depends on. Declared locally so the module is testable without
 * relying on browser globals or lib.dom types (which vary across TS configs).
 */
export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

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

  let recognition: SpeechRecognitionLike | null = null;

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
    return () => new Ctor();
  };

  function start() {
    const factory = resolveFactory();
    if (!factory) {
      error = "unsupported: SpeechRecognition is not available in this browser";
      state = "error";
      return;
    }
    error = null;
    recognition = factory();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      options.lang ??
      (typeof navigator !== "undefined" ? navigator.language : "") ??
      "";
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;
    recognition.start();
    state = "recording";
  }

  function stop() {
    recognition?.stop();
  }

  function cancel() {
    const active = recognition;
    recognition = null;
    interimText = "";
    finalText = "";
    state = "idle";
    if (active) {
      active.onresult = null;
      active.abort();
    }
  }

  function handleEnd() {
    recognition = null;
    if (state !== "error") {
      state = "idle";
    }
  }

  function handleError(event: SpeechRecognitionErrorEventLike) {
    error = event.message ? `${event.error}: ${event.message}` : event.error;
    state = "error";
  }

  function handleResult(event: SpeechRecognitionEventLike) {
    // Dev-only: dump the raw event shape so we can see what mobile browsers
    // are actually emitting. Stripped in production.
    if (import.meta.env.DEV) {
      const snapshot: Array<{
        i: number;
        isFinal: boolean;
        transcript: string;
      }> = [];
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        snapshot.push({
          i,
          isFinal: r.isFinal,
          transcript: r[0]?.transcript ?? "",
        });
      }
      void import("./debug-log").then(({ debugLog }) => {
        debugLog("speech:onresult", {
          resultIndex: event.resultIndex,
          length: event.results.length,
          results: snapshot,
        });
      });
    }

    // Strategy: "latest slot wins". The current live transcript is the
    // transcript of the last result slot in the event. If that slot is
    // `isFinal`, it becomes `finalText` (replacing, not appending); otherwise
    // it becomes `interimText`.
    //
    // Rationale: mobile Chrome emits every update as a brand-new
    // `isFinal: true` slot whose transcript already contains all previous
    // words (cumulative rewrite). Appending each snapshot produces the
    // "thisthis isthis is a..." concatenation bug. Desktop Chrome with a
    // single utterance updates one slot in place, which also works under
    // this rule.
    //
    // Known limitation: with `continuous = true` and long multi-sentence
    // dictation, desktop browsers emit several truly disjoint final slots.
    // Under this rule we keep only the most recent one. Acceptable for the
    // current product (short hold-to-record utterances); revisit if
    // multi-segment dictation becomes a requirement.
    const last = event.results[event.results.length - 1];
    if (!last) return;
    const transcript = last[0].transcript;
    if (last.isFinal) {
      finalText = transcript;
      interimText = "";
    } else {
      interimText = transcript;
    }
  }

  return {
    get state() {
      return state;
    },
    get interimText() {
      return interimText;
    },
    get finalText() {
      return finalText;
    },
    get error() {
      return error;
    },
    start,
    stop,
    cancel,
  };
}
