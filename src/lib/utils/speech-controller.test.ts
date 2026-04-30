import { describe, it, expect, vi } from "vitest";
import {
  createSpeechController,
  type SpeechEvent,
} from "./speech-controller";
import { createFakeRecognition } from "./speech-controller.fake";

/**
 * Helper: create a controller wired to a fake recognition and collect every
 * emitted event into an array for assertion.
 */
function setup() {
  const fake = createFakeRecognition();
  const controller = createSpeechController({ recognitionFactory: fake.factory });
  const events: SpeechEvent[] = [];
  const unsubscribe = controller.subscribe((e) => events.push(e));
  return { fake, controller, events, unsubscribe };
}

describe("speech-controller: lifecycle", () => {
  it("isSupported is true when a factory resolves", () => {
    const { controller } = setup();
    expect(controller.isSupported).toBe(true);
  });

  it("isSupported is false when no SpeechRecognition is available", () => {
    const controller = createSpeechController(); // no factory, no window
    expect(controller.isSupported).toBe(false);
  });

  it("start() begins recognition", () => {
    const { fake, controller } = setup();
    controller.start();
    expect(fake.current().started).toBe(true);
  });

  it("start() is a no-op when unsupported", () => {
    const controller = createSpeechController();
    controller.start(); // must not throw
  });
});

describe("speech-controller: transcript events", () => {
  it("emits a transcript event for interim updates", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitInterim("hello");
    expect(events).toEqual([{ type: "transcript", text: "hello" }]);
  });

  it("emits a transcript event for final results", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitInterim("hello");
    fake.current().emitFinal("hello world.");
    expect(events).toEqual([
      { type: "transcript", text: "hello" },
      { type: "transcript", text: "hello world." },
    ]);
  });

  it("de-duplicates consecutive identical transcripts (D1)", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitInterim("same");
    fake.current().emitInterim("same");
    expect(events).toEqual([{ type: "transcript", text: "same" }]);
  });

  it(
    "does not cumulatively concatenate when mobile Chrome emits each " +
      "update as a new result slot with the cumulative transcript",
    () => {
      const { fake, controller, events } = setup();
      controller.start();
      fake.current().emitInterim("this");
      fake.current().emitInterim("this is");
      fake.current().emitInterim("this is a");
      fake.current().emitInterim("this is a test");
      const last = events[events.length - 1];
      expect(last).toEqual({ type: "transcript", text: "this is a test" });
    },
  );

  it(
    "commits latest cumulative final when mobile Chrome emits a chain of " +
      "isFinal=true slots each containing the growing text",
    () => {
      const { fake, controller, events } = setup();
      controller.start();
      fake.current().emitCumulativeFinal("this");
      fake.current().emitCumulativeFinal("this is");
      fake.current().emitCumulativeFinal("this is another");
      fake.current().emitCumulativeFinal("this is another test");
      const last = events[events.length - 1];
      expect(last).toEqual({ type: "transcript", text: "this is another test" });
    },
  );

  it("start() after a previous session resets the transcript baseline", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitFinal("first");
    controller.stop();
    fake.current().emitEnd();

    events.length = 0;
    controller.start();
    fake.current().emitInterim("fresh");
    expect(events).toEqual([{ type: "transcript", text: "fresh" }]);
  });
});

describe("speech-controller: error mapping", () => {
  const cases: Array<[string, string]> = [
    ["no-speech", "no-speech"],
    ["network", "network"],
    ["audio-capture", "audio-capture"],
    ["aborted", "aborted"],
    ["language-not-supported", "unknown"],
  ];

  for (const [raw, code] of cases) {
    it(`maps raw '${raw}' to code '${code}' while collecting`, () => {
      const { fake, controller, events } = setup();
      controller.start();
      fake.current().emitError(raw);
      expect(events).toEqual([{ type: "error", code }]);
    });
  }

  it("swallows non-permission errors fired while not collecting (pre-warm)", () => {
    const { fake, events } = setup();
    // No start() — engine is pre-warming.
    fake.current().emitError("no-speech");
    fake.current().emitError("network");
    expect(events).toEqual([]);
  });

  it("swallows errors after self-initiated stop() (teardown noise)", () => {
    const { fake, controller, events } = setup();
    controller.start();
    events.length = 0;
    controller.stop();
    fake.current().emitError("aborted");
    fake.current().emitError("not-allowed"); // Chrome sometimes fires this
    fake.current().emitEnd();
    expect(events).toEqual([]);
  });

  it("swallows errors after self-initiated cancel()", () => {
    const { fake, controller, events } = setup();
    controller.start();
    events.length = 0;
    controller.cancel();
    fake.current().emitError("aborted");
    expect(events).toEqual([]);
  });
});

describe("speech-controller: permission-denied", () => {
  it("emits permission-denied once when 'not-allowed' arrives mid-session", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitError("not-allowed");
    expect(events).toEqual([{ type: "permission-denied" }]);
  });

  it("emits permission-denied for 'service-not-allowed' too", () => {
    const { fake, controller, events } = setup();
    controller.start();
    fake.current().emitError("service-not-allowed");
    expect(events).toEqual([{ type: "permission-denied" }]);
  });

  it("emits permission-denied even when fired pre-warm (not collecting)", () => {
    const { fake, events } = setup();
    fake.current().emitError("not-allowed");
    expect(events).toEqual([{ type: "permission-denied" }]);
  });

  it("is sticky: start() is a no-op after denial", () => {
    const { fake, controller } = setup();
    fake.current().emitError("not-allowed");
    const before = fake.current();
    before.started = false;
    controller.start();
    expect(before.started).toBe(false);
  });

  it("does not re-emit permission-denied on a second 'not-allowed'", () => {
    const { fake, events } = setup();
    fake.current().emitError("not-allowed");
    fake.current().emitError("not-allowed");
    expect(events).toEqual([{ type: "permission-denied" }]);
  });

  it("stop() is a no-op after sticky denial", () => {
    const { fake, controller } = setup();
    fake.current().emitError("not-allowed");
    // Must not throw, must not reset stickiness.
    return controller.stop();
  });
});

describe("speech-controller: stop() flush semantics", () => {
  it("resolves after the engine flushes onend; transcript events arrive first", async () => {
    const { fake, controller, events } = setup();
    controller.start();
    const instance = fake.current();
    const stopped = controller.stop();

    // Trailing final arrives BEFORE onend (Chrome flushes pending results).
    instance.emitFinal("let's try this again");

    let resolved = false;
    void stopped.then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(events).toContainEqual({
      type: "transcript",
      text: "let's try this again",
    });

    instance.emitEnd();
    await stopped;
    expect(resolved).toBe(true);
  });

  it("resolves via the 500ms safety timeout if onend never fires", async () => {
    vi.useFakeTimers();
    try {
      const { controller } = setup();
      controller.start();
      const stopped = controller.stop();
      await vi.advanceTimersByTimeAsync(600);
      await stopped;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("speech-controller: subscribe", () => {
  it("unsubscribe stops further events from arriving", () => {
    const { fake, controller, events, unsubscribe } = setup();
    controller.start();
    fake.current().emitInterim("a");
    unsubscribe();
    fake.current().emitInterim("b");
    expect(events).toEqual([{ type: "transcript", text: "a" }]);
  });

  it("does not replay past events to late subscribers (D2)", () => {
    const fake = createFakeRecognition();
    const controller = createSpeechController({ recognitionFactory: fake.factory });
    controller.start();
    fake.current().emitInterim("already happened");

    const late: SpeechEvent[] = [];
    controller.subscribe((e) => late.push(e));
    expect(late).toEqual([]);

    fake.current().emitInterim("now");
    expect(late).toEqual([{ type: "transcript", text: "now" }]);
  });

  it("fans out to multiple subscribers", () => {
    const { fake, controller } = setup();
    const a: SpeechEvent[] = [];
    const b: SpeechEvent[] = [];
    controller.subscribe((e) => a.push(e));
    controller.subscribe((e) => b.push(e));
    controller.start();
    fake.current().emitInterim("hi");
    expect(a).toContainEqual({ type: "transcript", text: "hi" });
    expect(b).toContainEqual({ type: "transcript", text: "hi" });
  });
});
