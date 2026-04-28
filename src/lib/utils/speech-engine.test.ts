import { describe, it, expect } from "vitest";
import { createSpeechEngine } from "./speech-engine";
import { createFakeRecognition } from "./speech-controller.fake";

describe("speech-engine", () => {
  it("starts recognition immediately on creation (pre-warm)", () => {
    const fake = createFakeRecognition();
    createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: () => {}, onError: () => {} });

    expect(fake.current().started).toBe(true);
  });

  it("destroy stops the engine and prevents further restarts", () => {
    const fake = createFakeRecognition();
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    const first = fake.current();

    engine.destroy();
    first.emitEnd();

    expect(fake.current()).toBe(first); // no new instance
  });

  it("forwards errors via onError and does not restart after fatal error", () => {
    const fake = createFakeRecognition();
    const errors: string[] = [];
    createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: () => {}, onError: (e) => errors.push(e) });
    const first = fake.current();

    first.emitError("not-allowed");
    first.emitEnd();

    expect(errors).toEqual(["not-allowed"]);
    // Should not restart after a fatal error
    expect(fake.current()).toBe(first);
  });

  it("cancelCollecting discards accumulated text and resumes warming", () => {
    const fake = createFakeRecognition();
    const finals: string[] = [];
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: (t) => finals.push(t), onError: () => {} });
    const first = fake.current();

    engine.startCollecting();
    fake.current().emitFinal("throwaway text");
    engine.cancelCollecting();
    first.emitEnd();

    // Engine should have restarted (back to warming)
    expect(fake.current()).not.toBe(first);
    // A subsequent collection should start clean
    engine.startCollecting();
    fake.current().emitFinal("fresh start");
    expect(finals.at(-1)).toBe("fresh start");
  });

  it("second recording works after first is stopped", () => {
    const fake = createFakeRecognition();
    const finals: string[] = [];
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: (t) => finals.push(t), onError: () => {} });

    // First recording
    engine.startCollecting();
    fake.current().emitFinal("first recording");
    engine.stopCollecting();
    fake.current().emitEnd(); // engine restarts for warming

    // Second recording
    engine.startCollecting();
    fake.current().emitFinal("second recording");

    expect(finals.at(-1)).toBe("second recording");
  });

  it("stopCollecting stops collecting and resumes warming (ready for next recording)", () => {
    const fake = createFakeRecognition();
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: () => {}, onError: () => {} });
    const first = fake.current();

    engine.startCollecting();
    engine.stopCollecting();
    first.emitEnd();

    // Engine should restart for warming so the next recording is ready
    expect(first.stopped).toBe(true);
    expect(fake.current()).not.toBe(first);
    expect(fake.current().started).toBe(true);
  });

  it("accumulates text across sessions when engine restarts mid-collection", () => {
    const fake = createFakeRecognition();
    const finals: string[] = [];
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: (t) => finals.push(t), onError: () => {} });

    engine.startCollecting();
    fake.current().emitFinal("hello world.");
    // Silence timeout ends the session
    fake.current().emitEnd();
    // New session — user continues speaking
    fake.current().emitFinal("and then something.");

    expect(finals.at(-1)).toBe("hello world. and then something.");
  });

  it("auto-restarts after silence timeout during warm (onend fires)", () => {
    const fake = createFakeRecognition();
    createSpeechEngine({ recognitionFactory: fake.factory, onInterim: () => {}, onFinal: () => {}, onError: () => {} });

    const first = fake.current();
    first.emitEnd();

    const second = fake.current();
    expect(second).not.toBe(first);
    expect(second.started).toBe(true);
  });

  it("does not forward results before startCollecting (pre-warm is silent)", () => {
    const fake = createFakeRecognition();
    const interim: string[] = [];
    createSpeechEngine({ recognitionFactory: fake.factory, onInterim: (t) => interim.push(t), onFinal: () => {}, onError: () => {} });

    fake.current().emitInterim("ambient noise");

    expect(interim).toEqual([]);
  });

  it("forwards interim results to onInterim while collecting", () => {
    const fake = createFakeRecognition();
    const interim: string[] = [];
    const engine = createSpeechEngine({ recognitionFactory: fake.factory, onInterim: (t) => interim.push(t), onFinal: () => {}, onError: () => {} });

    engine.startCollecting();
    fake.current().emitInterim("hello");
    fake.current().emitInterim("hello world");

    expect(interim).toEqual(["hello", "hello world"]);
  });
});
