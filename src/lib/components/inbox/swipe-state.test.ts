import { describe, it, expect } from "vitest";
import { createSwipeState } from "./swipe-state";

describe("createSwipeState", () => {
  it("onMove() returns translateX clamped to [−rowWidth, +rowWidth]", () => {
    const s = createSwipeState(200);

    expect(s.onMove(-50)).toBe(-50);   // normal left swipe
    expect(s.onMove(-250)).toBe(-200); // past full width left — clamped to −rowWidth
    expect(s.onMove(30)).toBe(30);     // rightward swipe — allowed
    expect(s.onMove(250)).toBe(200);   // past full width right — clamped to +rowWidth
  });

  it("onRelease() returns 'rebound' when dx is below 40% of rowWidth", () => {
    const s = createSwipeState(200); // threshold = 80px

    expect(s.onRelease(-79)).toBe("rebound"); // just under leftward
    expect(s.onRelease(-1)).toBe("rebound");  // tiny left drag
    expect(s.onRelease(0)).toBe("rebound");   // no movement
    expect(s.onRelease(1)).toBe("rebound");   // tiny right drag
    expect(s.onRelease(79)).toBe("rebound");  // just under rightward
  });

  it("onRelease() returns 'commit-left' when dx meets or exceeds 40% of rowWidth leftward", () => {
    const s = createSwipeState(200); // threshold = 80px

    expect(s.onRelease(-80)).toBe("commit-left");  // exactly at threshold
    expect(s.onRelease(-120)).toBe("commit-left"); // well past
    expect(s.onRelease(-200)).toBe("commit-left"); // full width
  });

  it("onRelease() returns 'commit-right' when dx meets or exceeds 40% of rowWidth rightward", () => {
    const s = createSwipeState(200); // threshold = 80px

    expect(s.onRelease(80)).toBe("commit-right");  // exactly at threshold
    expect(s.onRelease(120)).toBe("commit-right"); // well past
    expect(s.onRelease(200)).toBe("commit-right"); // full width
  });

  it("onCancel() always returns 'rebound' regardless of how far the drag went", () => {
    const s = createSwipeState(200);

    expect(s.onCancel()).toBe("rebound");
  });
});
