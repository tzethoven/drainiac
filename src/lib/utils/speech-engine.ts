import { debugLog } from "./debug-log";

/**
 * Minimal subset of the Web Speech API `SpeechRecognition` interface that the
 * engine depends on. Declared locally so the module is testable without
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

export interface SpeechEngineOptions {
  recognitionFactory: () => SpeechRecognitionLike;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
  /** Fires after a self-initiated stop() completes its onend flush. */
  onStopped?: () => void;
}

export interface SpeechEngine {
  startCollecting(): void;
  stopCollecting(): void;
  cancelCollecting(): void;
  destroy(): void;
}

export function createSpeechEngine(options: SpeechEngineOptions): SpeechEngine {
  let recognition: SpeechRecognitionLike | null = null;
  let collecting = false;
  let stopping = false; // stopCollecting() called; waiting for onend
  let cancelling = false; // cancelCollecting() called; waiting for onend
  let fatalError = false; // after not-allowed / permanent error, stop restarting
  let destroyed = false;
  let sessionAccumulated = ""; // final text from completed sessions in this collection
  let currentSessionFinal = ""; // latest final within the current session

  function spawnRecognition() {
    recognition = options.recognitionFactory();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;
    recognition.start();
  }

  function handleResult(event: SpeechRecognitionEventLike) {
    if (!collecting) return;
    const results = event.results;
    const last = results[results.length - 1];
    if (!last) return;
    const text = last[0].transcript;
    const full = sessionAccumulated ? sessionAccumulated + " " + text : text;
    debugLog("engine:onresult", {
      resultIndex: event.resultIndex,
      slotCount: results.length,
      lastIsFinal: last.isFinal,
      text,
      sessionAccumulated,
      full,
      allSlots: Array.from({ length: results.length }, (_, i) => ({
        isFinal: results[i].isFinal,
        transcript: results[i][0].transcript,
      })),
    });
    if (last.isFinal) {
      currentSessionFinal = text;
      options.onFinal(full);
    } else {
      options.onInterim(full);
    }
  }
  function handleError(event: SpeechRecognitionErrorEventLike) {
    const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed"]);
    if (FATAL_ERRORS.has(event.error)) {
      fatalError = true;
    }
    options.onError(event.error);
  }
  function handleEnd() {
    recognition = null;
    debugLog("engine:onend", {
      stopping,
      cancelling,
      collecting,
      currentSessionFinal,
      sessionAccumulated,
      fatalError,
      destroyed,
    });
    if (stopping || cancelling) {
      // Deliberate end — discard any uncommitted session state and resume warming
      const wasStopping = stopping;
      stopping = false;
      cancelling = false;
      collecting = false;
      sessionAccumulated = "";
      currentSessionFinal = "";
      if (wasStopping) options.onStopped?.();
    } else {
      // Silence timeout mid-collection — commit current session text so the
      // next session continues from the right baseline
      if (collecting && currentSessionFinal) {
        sessionAccumulated = sessionAccumulated
          ? sessionAccumulated + " " + currentSessionFinal
          : currentSessionFinal;
      }
      currentSessionFinal = "";
    }
    if (fatalError) return;
    if (destroyed) return;
    spawnRecognition();
  }

  spawnRecognition();

  return {
    startCollecting() {
      collecting = true;
      sessionAccumulated = "";
      currentSessionFinal = "";
    },
    stopCollecting() {
      stopping = true;
      recognition?.stop();
    },
    cancelCollecting() {
      cancelling = true;
      collecting = false;
      recognition?.abort();
    },
    destroy() {
      destroyed = true;
      recognition?.abort();
      recognition = null;
    },
  };
}
