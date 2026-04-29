import { describe, it, expect, vi } from "vitest";
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
    const recordingInstance = fake.current(); // capture before stop triggers restart
    controller.stop();
    recordingInstance.emitEnd();

    expect(recordingInstance.stopped).toBe(true);
    expect(controller.state).toBe("idle");
    expect(controller.finalText).toBe("committed thought.");
  });

  it("cancel() discards interim and final text and aborts recognition", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitFinal("throwaway");
    fake.current().emitInterim(" more");
    const recordingInstance = fake.current(); // capture before cancel triggers restart
    controller.cancel();
    recordingInstance.emitEnd();

    expect(recordingInstance.aborted).toBe(true);
    expect(controller.state).toBe("idle");
    expect(controller.finalText).toBe("");
    expect(controller.interimText).toBe("");
  });

  it("maps raw 'not-allowed' to state 'permission-denied' with error=null", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("not-allowed", "Microphone permission denied");

    expect(controller.state).toBe("permission-denied");
    expect(controller.error).toBeNull();
  });

  it("maps raw 'service-not-allowed' to state 'permission-denied'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("service-not-allowed");

    expect(controller.state).toBe("permission-denied");
    expect(controller.error).toBeNull();
  });

  it("maps raw 'no-speech' to state 'error' with code 'no-speech' while recording", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("no-speech");

    expect(controller.state).toBe("error");
    expect(controller.error).toBe("no-speech");
  });

  it("maps raw 'network' while recording to error code 'network'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("network");

    expect(controller.state).toBe("error");
    expect(controller.error).toBe("network");
  });

  it("maps raw 'audio-capture' while recording to error code 'audio-capture'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("audio-capture");

    expect(controller.state).toBe("error");
    expect(controller.error).toBe("audio-capture");
  });

  it("maps unknown raw error strings to error code 'unknown'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("language-not-supported");

    expect(controller.state).toBe("error");
    expect(controller.error).toBe("unknown");
  });

  it("surfaces external 'aborted' during recording as error code 'aborted'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("aborted");

    expect(controller.state).toBe("error");
    expect(controller.error).toBe("aborted");
  });

  it("swallows 'aborted' event triggered by self-initiated cancel()", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    const instance = fake.current();
    controller.cancel();
    instance.emitError("aborted");
    instance.emitEnd();

    expect(controller.state).toBe("idle");
    expect(controller.error).toBeNull();
  });

  it("swallows 'aborted' event triggered by self-initiated stop()", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    const instance = fake.current();
    controller.stop();
    instance.emitError("aborted");
    instance.emitEnd();

    expect(controller.state).toBe("idle");
    expect(controller.error).toBeNull();
  });

  it("initialises in state 'unsupported' when no SpeechRecognition is available", () => {
    const controller = createSpeechController(); // no factory, no browser globals

    expect(controller.state).toBe("unsupported");
    expect(controller.error).toBeNull();
  });

  it("swallows non-permission errors fired while not recording (pre-warming noise)", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    // Engine is pre-warming; user has NOT held the button.
    fake.current().emitError("no-speech");
    fake.current().emitError("network");

    expect(controller.state).toBe("idle");
    expect(controller.error).toBeNull();
  });

  it("surfaces 'not-allowed' fired from pre-warming as state 'permission-denied'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    fake.current().emitError("not-allowed");

    expect(controller.state).toBe("permission-denied");
    expect(controller.error).toBeNull();
  });

  it("start() is a no-op when state is 'unsupported'", () => {
    const controller = createSpeechController();

    controller.start();

    expect(controller.state).toBe("unsupported");
  });

  it("start() is a no-op when state is 'permission-denied'", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    fake.current().emitError("not-allowed");
    const beforeInstance = fake.current();
    beforeInstance.started = false; // reset to detect new starts
    controller.start();

    expect(controller.state).toBe("permission-denied");
    expect(beforeInstance.started).toBe(false);
  });

  it("clears transient error state on next start()", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("network");
    expect(controller.state).toBe("error");

    controller.start();

    expect(controller.state).toBe("recording");
    expect(controller.error).toBeNull();
  });

  it("stop() returns a promise that resolves after the engine flushes onend", async () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    const instance = fake.current();
    const stopped = controller.stop();

    // Trailing final arrives BEFORE onend (Chrome flushes pending results).
    instance.emitFinal("let's try this again");

    // Promise must NOT have resolved yet — onend hasn't fired.
    let resolved = false;
    void stopped.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(controller.finalText).toBe("let's try this again");

    instance.emitEnd();
    await stopped;

    expect(controller.finalText).toBe("let's try this again");
    expect(controller.state).toBe("idle");
  });

  it("stop() promise resolves via timeout if onend never fires", async () => {
    vi.useFakeTimers();
    try {
      const fake = createFakeRecognition();
      const controller = createSpeechController({ recognitionFactory: fake.factory });

      controller.start();
      const stopped = controller.stop();
      // Do NOT emit end. Advance time past the timeout.
      await vi.advanceTimersByTimeAsync(600);
      await stopped; // must resolve
    } finally {
      vi.useRealTimers();
    }
  });

  it("swallows spurious errors after a self-initiated stop (not just aborted)", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    const instance = fake.current();
    controller.stop();
    // Chrome sometimes emits a spurious 'not-allowed' during teardown.
    instance.emitError("not-allowed");

    expect(controller.state).toBe("idle");
    expect(controller.error).toBeNull();
  });

  it("stop() does not clear sticky 'permission-denied' state", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("not-allowed");
    expect(controller.state).toBe("permission-denied");

    controller.stop();

    expect(controller.state).toBe("permission-denied");
  });

  it("cancel() does not clear sticky 'permission-denied' state", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });

    controller.start();
    fake.current().emitError("not-allowed");
    controller.cancel();

    expect(controller.state).toBe("permission-denied");
  });
});
