import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  type SessionEffect,
  type SessionEvent,
  type SessionState,
} from "./capture-session";

// --- driver helpers ------------------------------------------------------

/** Apply a sequence of events, returning the final state and all emitted effects. */
function run(
  events: SessionEvent[],
  start: SessionState = initialState(),
): { state: SessionState; effects: SessionEffect[] } {
  let state = start;
  const effects: SessionEffect[] = [];
  for (const e of events) {
    const r = reduce(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

// --- idle ----------------------------------------------------------------

describe("capture-session: idle", () => {
  it("holdStart → recording + startSpeech", () => {
    const r = reduce(initialState(), { type: "holdStart" });
    expect(r.state.phase).toBe("recording");
    expect(r.effects).toEqual([{ type: "startSpeech" }]);
  });

  it("speechDenied while idle → denied, sticky (invariant #5)", () => {
    const r = reduce(initialState(), { type: "speechDenied" });
    expect(r.state.phase).toBe("denied");
    expect(r.effects).toEqual([]);
  });

  it("unrelated events are no-ops", () => {
    const r = reduce(initialState(), { type: "holdRelease" });
    expect(r.state).toEqual(initialState());
    expect(r.effects).toEqual([]);
  });
});

// --- recording: transcript + errors --------------------------------------

describe("capture-session: recording — transcript & errors", () => {
  it("accumulates partial text via speechTranscriptChanged", () => {
    const { state } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "hello" },
      { type: "speechTranscriptChanged", text: "hello world" },
    ]);
    expect(state.partialText).toBe("hello world");
  });

  it("speechErrored stashes code without terminating", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "partial thought" },
      { type: "speechErrored", code: "network" },
    ]);
    expect(state.phase).toBe("recording");
    expect(state.lastErrorCode).toBe("network");
    // no additional effects beyond the initial startSpeech
    expect(effects).toEqual([{ type: "startSpeech" }]);
  });

  it("speechDenied during recording → denied + cancelSpeech (invariant #5)", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "never saved" },
      { type: "speechDenied" },
    ]);
    expect(state.phase).toBe("denied");
    expect(state.partialText).toBe("");
    expect(effects).toEqual([
      { type: "startSpeech" },
      { type: "cancelSpeech" },
    ]);
  });
});

// --- recording: termination paths ---------------------------------------

describe("capture-session: termination — release (happy path)", () => {
  it("release with partial → saveEntry (no warning), stays in recording until entrySaved", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "todo buy milk" },
      { type: "holdRelease" },
    ]);
    expect(state.phase).toBe("recording");
    // no cancelSpeech — adapter already stopped the mic (B4a)
    const saveFx = effects.find((e) => e.type === "saveEntry");
    expect(saveFx).toEqual({
      type: "saveEntry",
      parsed: {
        category: "todo",
        displayText: "Buy milk.",
        rawTranscript: "todo buy milk",
      },
      warning: false,
    });
    expect(effects.some((e) => e.type === "showToast")).toBe(false);
    expect(effects.some((e) => e.type === "cancelSpeech")).toBe(false);
  });

  it("release with empty → discard + 'Didn't catch that' toast", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "holdRelease" },
    ]);
    expect(state.phase).toBe("idle");
    expect(effects).toEqual([
      { type: "startSpeech" },
      { type: "showToast", message: "Didn't catch that" },
    ]);
  });
});

describe("capture-session: termination — mid-hold error then release", () => {
  it("network + partial: save with warning + toast", () => {
    const { effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "note hello" },
      { type: "speechErrored", code: "network" },
      { type: "holdRelease" },
    ]);
    const saveFx = effects.find((e) => e.type === "saveEntry");
    expect(saveFx?.type).toBe("saveEntry");
    if (saveFx?.type === "saveEntry") {
      expect(saveFx.warning).toBe(true);
    }
    expect(effects).toContainEqual({
      type: "showToast",
      message: "Speech recognition needs a connection — try again",
    });
  });

  it("no-speech (silence) + empty: no save, toast only", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechErrored", code: "no-speech" },
      { type: "holdRelease" },
    ]);
    expect(state.phase).toBe("idle");
    expect(effects.some((e) => e.type === "saveEntry")).toBe(false);
    expect(effects).toContainEqual({
      type: "showToast",
      message: "Didn't catch that",
    });
  });
});

describe("capture-session: termination — slide-cancel", () => {
  it("holdSlideCancel → idle + cancelSpeech, no save, no toast (ADR-0002)", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "I changed my mind" },
      { type: "holdSlideCancel" },
    ]);
    expect(state).toEqual(initialState());
    expect(effects).toEqual([
      { type: "startSpeech" },
      { type: "cancelSpeech" },
    ]);
  });
});

describe("capture-session: termination — pointer-interrupted (ADR-0002, invariant #6)", () => {
  it("with partial → cancelSpeech + saveEntry (no warning), no toast", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "phone rang mid thought" },
      { type: "pointerInterrupted" },
    ]);
    expect(state.phase).toBe("recording"); // awaits entrySaved
    expect(effects).toContainEqual({ type: "cancelSpeech" });
    const save = effects.find((e) => e.type === "saveEntry");
    expect(save?.type).toBe("saveEntry");
    if (save?.type === "saveEntry") {
      expect(save.warning).toBe(false);
    }
    expect(effects.some((e) => e.type === "showToast")).toBe(false);
  });

  it("with empty → idle + cancelSpeech, no save, no toast", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "pointerInterrupted" },
    ]);
    expect(state.phase).toBe("idle");
    expect(effects).toEqual([
      { type: "startSpeech" },
      { type: "cancelSpeech" },
    ]);
  });
});

// --- effect-then-event: entrySaved ---------------------------------------

describe("capture-session: entrySaved → saved-visible", () => {
  it("transitions recording → saved-visible and schedules the timer", () => {
    const { state, effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "idea compound interest" },
      { type: "holdRelease" },
      { type: "entrySaved" },
    ]);
    expect(state.phase).toBe("saved-visible");
    expect(state.lastSavedDisplayText).toBe("Compound interest.");
    expect(effects).toContainEqual({ type: "scheduleFinalTimer" });
  });

  it("entrySaved outside recording is a no-op (defensive)", () => {
    const r = reduce(initialState(), { type: "entrySaved" });
    expect(r.state).toEqual(initialState());
    expect(r.effects).toEqual([]);
  });
});

// --- saved-visible -------------------------------------------------------

describe("capture-session: saved-visible", () => {
  const reachedSavedVisible = (): SessionState => {
    const { state } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "note hello" },
      { type: "holdRelease" },
      { type: "entrySaved" },
    ]);
    return state;
  };

  it("finalDisplayTimerElapsed → idle", () => {
    const r = reduce(reachedSavedVisible(), {
      type: "finalDisplayTimerElapsed",
    });
    expect(r.state).toEqual(initialState());
    expect(r.effects).toEqual([]);
  });

  it("holdStart during display → recording, cancels the timer", () => {
    const r = reduce(reachedSavedVisible(), { type: "holdStart" });
    expect(r.state.phase).toBe("recording");
    expect(r.effects).toEqual([
      { type: "cancelFinalTimer" },
      { type: "startSpeech" },
    ]);
  });

  it("speechDenied during display → denied, cancels the timer", () => {
    const r = reduce(reachedSavedVisible(), { type: "speechDenied" });
    expect(r.state.phase).toBe("denied");
    expect(r.effects).toEqual([{ type: "cancelFinalTimer" }]);
  });
});

// --- denied: sticky ------------------------------------------------------

describe("capture-session: denied is sticky", () => {
  it("all events are no-ops once denied (invariant #5)", () => {
    const start: SessionState = { ...initialState(), phase: "denied" };
    const events: SessionEvent[] = [
      { type: "holdStart" },
      { type: "holdRelease" },
      { type: "speechTranscriptChanged", text: "x" },
      { type: "speechErrored", code: "network" },
      { type: "entrySaved" },
      { type: "finalDisplayTimerElapsed" },
    ];
    for (const e of events) {
      const r = reduce(start, e);
      expect(r.state).toEqual(start);
      expect(r.effects).toEqual([]);
    }
  });
});

// --- invariant #3: exactly one outcome ----------------------------------

describe("capture-session: invariant #3 — exactly one outcome per session", () => {
  it("a second holdRelease after entrySaved cannot re-emit saveEntry", () => {
    const { effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "todo one" },
      { type: "holdRelease" },
      { type: "entrySaved" },
      // we're in saved-visible; holdRelease is not a valid event here
      { type: "holdRelease" },
    ]);
    const saves = effects.filter((e) => e.type === "saveEntry");
    expect(saves).toHaveLength(1);
  });

  it("speechErrored after holdRelease cannot rewrite the decision", () => {
    // After holdRelease we're still in `recording` awaiting entrySaved.
    // A late speechErrored just updates lastErrorCode; it must not emit
    // another saveEntry or toast.
    const { effects } = run([
      { type: "holdStart" },
      { type: "speechTranscriptChanged", text: "todo one" },
      { type: "holdRelease" },
      { type: "speechErrored", code: "network" },
      { type: "entrySaved" },
    ]);
    expect(effects.filter((e) => e.type === "saveEntry")).toHaveLength(1);
    expect(effects.filter((e) => e.type === "showToast")).toHaveLength(0);
  });
});
