import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createToastStore } from "./toast-store.svelte";
import type { Entry } from "./entries-store.svelte";

function makeEntry(): Entry {
  return {
    id: "e1",
    schemaVersion: 3,
    category: "todo",
    displayText: "Buy milk.",
    rawTranscript: "todo buy milk",
    source: "voice",
    done: false,
    createdAt: 1_000,
    updatedAt: 1_000,
    polish: null,
  };
}

describe("toast-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts empty", () => {
    const store = createToastStore();
    expect(store.message).toBeNull();
    expect(store.undoEntry).toBeNull();
  });

  it("show(message) without undoEntry sets message and leaves undoEntry null", () => {
    const store = createToastStore();
    store.show("Didn't catch that");
    expect(store.message).toBe("Didn't catch that");
    expect(store.undoEntry).toBeNull();
  });

  it("show(message, entry) sets both message and undoEntry", () => {
    const store = createToastStore();
    const entry = makeEntry();
    store.show("Deleted", entry);
    expect(store.message).toBe("Deleted");
    expect(store.undoEntry).toEqual(entry);
  });

  it("auto-dismisses after 5s for info toasts (no undoEntry)", () => {
    const store = createToastStore();
    store.show("Didn't catch that");
    vi.advanceTimersByTime(4_999);
    expect(store.message).toBe("Didn't catch that");
    vi.advanceTimersByTime(2);
    expect(store.message).toBeNull();
    expect(store.undoEntry).toBeNull();
  });

  it("auto-dismisses after 5s for undo toasts", () => {
    const store = createToastStore();
    store.show("Deleted", makeEntry());
    vi.advanceTimersByTime(5_001);
    expect(store.message).toBeNull();
    expect(store.undoEntry).toBeNull();
  });
});
