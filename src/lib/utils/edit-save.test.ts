import { describe, it, expect } from "vitest";
import { computeEditSave, REVERT_POLISH_PATCH } from "./edit-save";
import type { Entry, Polish } from "$lib/stores/entries-store.svelte";

function makeEntry(overrides: Partial<Entry> = {}): Entry {
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
    ...overrides,
  };
}

function makePolish(overrides: Partial<Polish> = {}): Polish {
  return {
    text: "Buy milk.",
    at: 2_000,
    model: "test-model",
    promptVersion: 1,
    ...overrides,
  };
}

describe("computeEditSave", () => {
  describe("case 1: input unchanged", () => {
    it("returns null when newText equals displayText on a never-polished entry", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      expect(computeEditSave("Buy milk.", entry)).toBeNull();
    });

    it("returns null when newText equals polish.text on a polished entry", () => {
      const entry = makeEntry({
        displayText: "buy milk",
        polish: makePolish({ text: "Buy milk." }),
      });
      expect(computeEditSave("Buy milk.", entry)).toBeNull();
    });

    it("treats whitespace-only differences as unchanged (normalize first)", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      expect(computeEditSave("  Buy   milk.  ", entry)).toBeNull();
    });

    it("returns null for blank input regardless of entry state", () => {
      expect(computeEditSave("", makeEntry())).toBeNull();
      expect(computeEditSave("   ", makeEntry())).toBeNull();
    });
  });

  describe("case 2: input differs on a polished entry", () => {
    it("returns a patch that writes displayText and clears polish in one shot", () => {
      const entry = makeEntry({
        displayText: "buy milk",
        polish: makePolish({ text: "Buy milk." }),
      });

      const patch = computeEditSave("Buy oat milk.", entry);

      expect(patch).toEqual({
        displayText: "Buy oat milk.",
        polish: null,
      });
    });

    it("normalizes the saved displayText", () => {
      const entry = makeEntry({ polish: makePolish() });
      const patch = computeEditSave("  buy   oat milk  ", entry);
      expect(patch).toMatchObject({ displayText: "buy oat milk" });
    });
  });

  describe("case 3: input differs on a never-polished entry", () => {
    it("returns a patch with only displayText", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      const patch = computeEditSave("Buy oat milk.", entry);
      expect(patch).toEqual({ displayText: "Buy oat milk." });
    });

    it("does not include a polish field (pre-polish behaviour)", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      const patch = computeEditSave("Buy oat milk.", entry);
      expect(patch).not.toHaveProperty("polish");
    });
  });
});

describe("REVERT_POLISH_PATCH", () => {
  it("clears the polish field in one shot", () => {
    expect(REVERT_POLISH_PATCH).toEqual({ polish: null });
  });
});
