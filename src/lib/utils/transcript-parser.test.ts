import { describe, it, expect } from "vitest";
import { parse } from "./transcript-parser";

describe("transcript-parser", () => {
  it("routes canonical 'todo' trigger, strips it, and cleans the remainder", () => {
    const result = parse("todo buy milk");

    expect(result).toEqual({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
    });
  });

  it("routes canonical 'note' trigger", () => {
    const result = parse("note remember the milk");

    expect(result).toEqual({
      category: "note",
      displayText: "Remember the milk.",
      rawTranscript: "note remember the milk",
    });
  });

  it("routes canonical 'idea' trigger", () => {
    const result = parse("idea voice-first PWA");

    expect(result).toEqual({
      category: "idea",
      displayText: "Voice-first PWA.",
      rawTranscript: "idea voice-first PWA",
    });
  });

  it.each([
    ["task buy milk", "todo", "Buy milk."],
    ["to-do buy milk", "todo", "Buy milk."],
    ["notes remember the milk", "note", "Remember the milk."],
    ["ideas voice-first PWA", "idea", "Voice-first PWA."],
    ["id voice-first PWA", "idea", "Voice-first PWA."],
  ])("resolves single-word alias %j to its canonical", (input, category, displayText) => {
    const result = parse(input);
    expect(result.category).toBe(category);
    expect(result.displayText).toBe(displayText);
    expect(result.rawTranscript).toBe(input);
  });

  it("resolves two-word 'to do' alias to canonical 'todo'", () => {
    const result = parse("to do buy milk");
    expect(result.category).toBe("todo");
    expect(result.displayText).toBe("Buy milk.");
    expect(result.rawTranscript).toBe("to do buy milk");
  });

  it("matches triggers case-insensitively", () => {
    expect(parse("TODO buy milk").category).toBe("todo");
    expect(parse("Note remember this").category).toBe("note");
    expect(parse("IDEA new app").category).toBe("idea");
    expect(parse("To Do buy milk").category).toBe("todo");
    expect(parse("TASK buy milk").category).toBe("todo");
  });

  it("tolerates leading whitespace and punctuation before the trigger", () => {
    expect(parse("  todo buy milk").category).toBe("todo");
    expect(parse(",todo buy milk").category).toBe("todo");
    expect(parse(" .. ,note remember").category).toBe("note");
    expect(parse("  to do buy milk").category).toBe("todo");
    expect(parse("  todo buy milk").displayText).toBe("Buy milk.");
  });

  describe("cleaning rules", () => {
    it("collapses runs of internal whitespace to a single space", () => {
      expect(parse("todo   buy    milk").displayText).toBe("Buy milk.");
    });

    it("does not append a period if text already ends with '.'", () => {
      expect(parse("todo buy milk.").displayText).toBe("Buy milk.");
    });

    it("does not append a period if text ends with '?' or '!'", () => {
      expect(parse("idea what if we try this?").displayText).toBe(
        "What if we try this?",
      );
      expect(parse("note yes!").displayText).toBe("Yes!");
    });

    it("trims trailing whitespace before terminal-period decision", () => {
      expect(parse("todo buy milk   ").displayText).toBe("Buy milk.");
    });
  });

  describe("no-match default", () => {
    it("defaults to 'note' when no trigger matches, keeping the full text", () => {
      const result = parse("just some random thought");
      expect(result.category).toBe("note");
      expect(result.displayText).toBe("Just some random thought.");
      expect(result.rawTranscript).toBe("just some random thought");
    });

    it("defaults to 'note' on empty input", () => {
      const result = parse("");
      expect(result.category).toBe("note");
      expect(result.displayText).toBe("");
      expect(result.rawTranscript).toBe("");
    });
  });

  it("returns rawTranscript verbatim regardless of routing or cleaning", () => {
    const noisy = "  ,TODO   Buy   MILK   ";
    const result = parse(noisy);
    expect(result.rawTranscript).toBe(noisy);
    expect(result.category).toBe("todo");
    expect(result.displayText).toBe("Buy MILK.");
  });
});
