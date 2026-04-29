import { describe, it, expect, vi } from "vitest";
import { createGestureState, type GestureCallbacks, type Scheduler } from "./gesture-state";

/**
 * Minimal manual scheduler for deterministic tests.
 * Returns a controller we can tick by id.
 */
function createManualScheduler() {
  let nextId = 0;
  const pending = new Map<number, { ms: number; cb: () => void }>();

  const scheduler: Scheduler = (ms, cb) => {
    const id = ++nextId;
    pending.set(id, { ms, cb });
    return () => {
      pending.delete(id);
    };
  };

  return {
    scheduler,
    /** Fire the most recently scheduled timer (if any). */
    fireLast() {
      const ids = [...pending.keys()];
      if (ids.length === 0) throw new Error("no pending timers");
      const id = ids[ids.length - 1];
      const entry = pending.get(id)!;
      pending.delete(id);
      entry.cb();
    },
    pendingCount() {
      return pending.size;
    },
  };
}

function makeCallbacks(): GestureCallbacks & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    onTap: vi.fn(() => { calls.push("tap"); }),
    onLongPress: vi.fn(() => { calls.push("long-press"); }),
    onCommitLeft: vi.fn(() => { calls.push("commit-left"); }),
    onCommitRight: vi.fn(() => { calls.push("commit-right"); }),
    onRebound: vi.fn(() => { calls.push("rebound"); }),
  };
}

describe("createGestureState", () => {
  it("emits 'tap' on down→up with no movement and no long-press fire", () => {
    const { scheduler } = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler, callbacks: cb });

    g.onDown(100);
    g.onUp(100);

    expect(cb.calls).toEqual(["tap"]);
  });

  it("emits 'long-press' when the timer fires before movement past threshold", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onMove(103); // 3 px — below 8 px threshold
    s.fireLast();

    expect(cb.calls).toEqual(["long-press"]);
  });

  it("does not emit 'tap' after long-press has fired; onUp is swallowed", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    s.fireLast(); // long-press fires
    g.onUp(100);

    expect(cb.calls).toEqual(["long-press"]);
  });

  it("movement past 8 px cancels the pending long-press timer", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    expect(s.pendingCount()).toBe(1);
    g.onMove(110); // 10 px — past threshold
    expect(s.pendingCount()).toBe(0);
  });

  it("onUp after swipe-past-threshold emits 'rebound' when below commit threshold", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });
    // commit threshold = 40% * 200 = 80 px

    g.onDown(100);
    g.onMove(130); // dx = 30; past 8 px but under 80 px
    g.onUp(130);

    expect(cb.calls).toEqual(["rebound"]);
  });

  it("onUp emits 'commit-right' when dx ≥ +80 px", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onMove(200); // dx = 100
    g.onUp(200);

    expect(cb.calls).toEqual(["commit-right"]);
  });

  it("onUp emits 'commit-left' when dx ≤ −80 px", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onMove(0); // dx = −100
    g.onUp(0);

    expect(cb.calls).toEqual(["commit-left"]);
  });

  it("onMove returns translateX clamped to [−rowWidth, +rowWidth] while swiping", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    expect(g.onMove(110)).toBe(10);    // small right drag
    expect(g.onMove(500)).toBe(200);   // clamped to +rowWidth
    expect(g.onMove(-500)).toBe(-200); // clamped to −rowWidth
  });

  it("onMove returns 0 before swipe threshold is crossed (no visual drag for taps)", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    expect(g.onMove(103)).toBe(0); // 3 px — still in pending/tap zone
    expect(g.onMove(107)).toBe(0); // 7 px — still in pending/tap zone
  });

  it("onMove after long-press has fired returns 0 and does not emit events", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    s.fireLast();
    expect(g.onMove(300)).toBe(0);
    expect(g.onMove(-300)).toBe(0);
    expect(cb.calls).toEqual(["long-press"]);
  });

  it("onCancel during swipe emits 'rebound' and cancels the timer", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onMove(130); // enter swiping
    g.onCancel();

    expect(cb.calls).toEqual(["rebound"]);
    expect(s.pendingCount()).toBe(0);
  });

  it("onCancel during pending (no movement) emits nothing and cancels the timer", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onCancel();

    expect(cb.calls).toEqual([]);
    expect(s.pendingCount()).toBe(0);
  });

  it("onCancel after long-press fired emits nothing", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    s.fireLast();
    g.onCancel();

    expect(cb.calls).toEqual(["long-press"]);
  });

  it("can handle a fresh gesture after a completed one", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onUp(100); // tap
    g.onDown(50);
    g.onMove(200); // dx = 150
    g.onUp(200); // commit-right

    expect(cb.calls).toEqual(["tap", "commit-right"]);
  });

  it("ignores onMove/onUp/onCancel before onDown (defensive)", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    expect(() => g.onMove(100)).not.toThrow();
    expect(() => g.onUp(100)).not.toThrow();
    expect(() => g.onCancel()).not.toThrow();
    expect(cb.calls).toEqual([]);
  });

  it("pointerup within 8 px movement after timer has not fired emits 'tap'", () => {
    const s = createManualScheduler();
    const cb = makeCallbacks();
    const g = createGestureState({ rowWidth: 200, scheduler: s.scheduler, callbacks: cb });

    g.onDown(100);
    g.onMove(105); // 5 px, below threshold
    g.onUp(105);

    expect(cb.calls).toEqual(["tap"]);
  });
});
