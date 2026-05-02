import { describe, it, expect } from "vitest";
import { computeEditSave, REVERT_POLISH_PATCH } from "./edit-save";
import type { Entry } from "$lib/stores/entries-store.svelte";

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "e1",
    schemaVersion: 2,
    category: "todo",
    displayText: "Buy milk.",
    rawTranscript: "todo buy milk",
    source: "voice",
    done: false,
    createdAt: 1_000,
    updatedAt: 1_000,
    polishedText: null,
    polishedAt: null,
    polishedModel: null,
    polishedPromptVersion: null,
    ...overrides,
  };
}

describe("computeEditSave", () => {
  describe("case 1: input unchanged", () => {
    it("returns null when newText equals displayText on a never-polished entry", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      expect(computeEditSave("Buy milk.", entry)).toBeNull();
    });

    it("returns null when newText equals polishedText on a polished entry", () => {
      const entry = makeEntry({
        displayText: "buy milk",
        polishedText: "Buy milk.",
        polishedAt: 2_000,
        polishedModel: "test-model",
        polishedPromptVersion: 1,
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
    it("returns a patch that writes displayText and clears all four polish fields", () => {
      const entry = makeEntry({
        displayText: "buy milk",
        polishedText: "Buy milk.",
        polishedAt: 2_000,
        polishedModel: "test-model",
        polishedPromptVersion: 1,
      });

      const patch = computeEditSave("Buy oat milk.", entry);

      expect(patch).toEqual({
        displayText: "Buy oat milk.",
        polishedText: null,
        polishedAt: null,
        polishedModel: null,
        polishedPromptVersion: null,
      });
    });

    it("normalizes the saved displayText", () => {
      const entry = makeEntry({
        polishedText: "Buy milk.",
        polishedAt: 2_000,
        polishedModel: "m",
        polishedPromptVersion: 1,
      });
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

    it("does not include polish-clearing fields (pre-polish behaviour)", () => {
      const entry = makeEntry({ displayText: "Buy milk." });
      const patch = computeEditSave("Buy oat milk.", entry);
      expect(patch).not.toHaveProperty("polishedText");
      expect(patch).not.toHaveProperty("polishedAt");
      expect(patch).not.toHaveProperty("polishedModel");
      expect(patch).not.toHaveProperty("polishedPromptVersion");
    });
  });
});

describe("REVERT_POLISH_PATCH", () => {
  it("clears exactly the four polish metadata fields", () => {
    expect(REVERT_POLISH_PATCH).toEqual({
      polishedText: null,
      polishedAt: null,
      polishedModel: null,
      polishedPromptVersion: null,
    });
  });
});
