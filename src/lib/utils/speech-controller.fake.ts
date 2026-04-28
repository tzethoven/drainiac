import type {
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
  SpeechRecognitionResultLike,
} from "./speech-engine";

/**
 * Test double for `SpeechRecognitionLike`. Lets tests drive the controller
 * through the real public event surface (onresult / onerror / onend) without
 * needing a browser.
 */
export interface FakeRecognitionHandle {
  factory: () => SpeechRecognitionLike;
  /** The most recently created instance (the one the controller is using). */
  current(): FakeRecognition;
}

export interface FakeRecognition extends SpeechRecognitionLike {
  started: boolean;
  stopped: boolean;
  aborted: boolean;
  emitInterim(text: string): void;
  emitFinal(text: string): void;
  /**
   * Mobile Chrome emission pattern: append a NEW `isFinal: true` slot whose
   * transcript carries the growing cumulative text. Does not mutate earlier
   * slots. `resultIndex` points at the newly appended slot.
   */
  emitCumulativeFinal(text: string): void;
  emitError(error: string, message?: string): void;
  emitEnd(): void;
}

export function createFakeRecognition(): FakeRecognitionHandle {
  let latest: FakeRecognition | null = null;

  const factory = (): SpeechRecognitionLike => {
    const results: SpeechRecognitionResultLike[] = [];

    const instance: FakeRecognition = {
      continuous: false,
      interimResults: false,
      lang: "",
      onresult: null,
      onerror: null,
      onend: null,
      started: false,
      stopped: false,
      aborted: false,
      start() {
        this.started = true;
      },
      stop() {
        this.stopped = true;
      },
      abort() {
        this.aborted = true;
      },
      emitInterim(text: string) {
        const resultIndex = results.length;
        results.push({ isFinal: false, 0: { transcript: text } });
        const event: SpeechRecognitionEventLike = {
          resultIndex,
          results,
        };
        this.onresult?.(event);
      },
      emitFinal(text: string) {
        // Mirror real Web Speech API: if there is a trailing interim result,
        // finalize it in place (same slot). Otherwise append a new final slot.
        const last = results[results.length - 1];
        let resultIndex: number;
        if (last && !last.isFinal) {
          resultIndex = results.length - 1;
          results[resultIndex] = { isFinal: true, 0: { transcript: text } };
        } else {
          resultIndex = results.length;
          results.push({ isFinal: true, 0: { transcript: text } });
        }
        const event: SpeechRecognitionEventLike = {
          resultIndex,
          results,
        };
        this.onresult?.(event);
      },
      emitCumulativeFinal(text: string) {
        const resultIndex = results.length;
        results.push({ isFinal: true, 0: { transcript: text } });
        const event: SpeechRecognitionEventLike = {
          resultIndex,
          results,
        };
        this.onresult?.(event);
      },
      emitError(error: string, message?: string) {
        const event: SpeechRecognitionErrorEventLike = { error, message };
        this.onerror?.(event);
      },
      emitEnd() {
        this.onend?.();
      },
    };

    latest = instance;
    return instance;
  };

  return {
    factory,
    current() {
      if (!latest) throw new Error("No recognition instance created yet");
      return latest;
    },
  };
}
