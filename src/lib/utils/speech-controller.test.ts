import { describe, it, expect } from "vitest";
import { createSpeechController } from "./speech-controller.svelte";
import { createFakeRecognition } from "./speech-controller.fake";

describe("speech-controller", () => {
  it("starts in idle state with empty transcripts and no error", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    expect(controller.state).toBe("idle");
    expect(controller.interimText).toBe("");
    expect(controller.finalText).toBe("");
    expect(controller.error).toBeNull();
  });

  it("transitions to recording when start() is called", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();

    expect(controller.state).toBe("recording");
    expect(fake.current().started).toBe(true);
  });

  it("exposes interim recognition results via interimText", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitInterim("hello");
    expect(controller.interimText).toBe("hello");

    fake.current().emitInterim("hello world");
    expect(controller.interimText).toBe("hello world");
  });

  it(
    "does not cumulatively concatenate interim results when the browser " +
      "emits each update as a new result slot (mobile Chrome behaviour)",
    () => {
      // Regression: on mobile Chrome, every interim update arrives as a new
      // result slot whose transcript already contains the cumulative text so
      // far. Iterating all slots from 0 would produce
      // "thisthis isthis is athis is a test".
      const fake = createFakeRecognition();
      const controller = createSpeechController({
        recognitionFactory: fake.factory,
      });

      controller.start();
      fake.current().emitInterim("this");
      fake.current().emitInterim("this is");
      fake.current().emitInterim("this is a");
      fake.current().emitInterim("this is a test");

      expect(controller.interimText).toBe("this is a test");
    },
  );

  it(
    "commits the latest cumulative transcript when mobile Chrome emits a " +
      "chain of isFinal=true slots each containing the growing text",
    () => {
      // Replays the exact emission pattern captured from mobile Chrome:
      // every update is a brand-new `isFinal: true` slot whose transcript
      // already contains all earlier spoken words. Appending each would yield
      // "thisthis isthis is another..."; we want only the latest snapshot.
      const fake = createFakeRecognition();
      const controller = createSpeechController({
        recognitionFactory: fake.factory,
      });

      controller.start();
      fake.current().emitCumulativeFinal("this");
      fake.current().emitCumulativeFinal("this is");
      fake.current().emitCumulativeFinal("this is another");
      fake.current().emitCumulativeFinal("this is another test");

      expect(controller.finalText).toBe("this is another test");
      expect(controller.interimText).toBe("");
    },
  );

  it("appends finalized results to finalText and clears interim", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitInterim("hello");
    fake.current().emitFinal("hello world.");

    expect(controller.finalText).toBe("hello world.");
    expect(controller.interimText).toBe("");
  });

  it("stop() ends recognition, preserves finalText, returns to idle", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitFinal("committed thought.");
    controller.stop();
    fake.current().emitEnd();

    expect(fake.current().stopped).toBe(true);
    expect(controller.state).toBe("idle");
    expect(controller.finalText).toBe("committed thought.");
  });

  it("cancel() discards interim and final text and aborts recognition", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitFinal("throwaway");
    fake.current().emitInterim(" more");
    controller.cancel();
    fake.current().emitEnd();

    expect(fake.current().aborted).toBe(true);
    expect(controller.state).toBe("idle");
    expect(controller.finalText).toBe("");
    expect(controller.interimText).toBe("");
  });

  it("surfaces recognition errors via error and state", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("not-allowed", "Microphone permission denied");
    fake.current().emitEnd();

    expect(controller.state).toBe("error");
    expect(controller.error).toContain("not-allowed");
  });

  it("reports an unsupported error when no SpeechRecognition is available", () => {
    const controller = createSpeechController(); // no factory, no browser globals

    controller.start();

    expect(controller.state).toBe("error");
    expect(controller.error).toMatch(/unsupported|not.?supported/i);
  });
});
