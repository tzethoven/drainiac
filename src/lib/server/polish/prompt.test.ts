import { describe, it, expect } from "vitest";
import { buildPolishPrompt, PROMPT_VERSION } from "./prompt";

describe("buildPolishPrompt", () => {
  it("exports PROMPT_VERSION = 1", () => {
    expect(PROMPT_VERSION).toBe(1);
  });

  it("pins sampling and output-shape config", () => {
    const { config } = buildPolishPrompt("todo", "x");
    expect(config.temperature).toBe(0.2);
    expect(config.maxOutputTokens).toBe(1024);
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseSchema.required).toEqual(["polished"]);
    expect(config.responseSchema.properties.polished.type).toBe("string");
  });

  it("puts the raw transcript verbatim in the user message", () => {
    const raw = "todo buy milk and eggs tomorrow";
    const { user } = buildPolishPrompt("todo", raw);
    expect(user).toBe(raw);
  });

  it("includes shared hard rules for every category", () => {
    const mustContain = [
      "Preserve meaning",
      "Preserve the original language",
      "Preserve proper nouns",
      "No markdown",
      "1.2×",
      "already clean",
      "unintelligible",
    ];
    for (const category of ["todo", "note", "idea"] as const) {
      const { system } = buildPolishPrompt(category, "x");
      for (const needle of mustContain) {
        expect(system, `category=${category} missing rule: ${needle}`).toContain(needle);
      }
    }
  });

  it("todo latitude: spelling/grammar only, keep wording and length", () => {
    const { system } = buildPolishPrompt("todo", "x");
    expect(system).toContain("TODO");
    expect(system).toMatch(/spelling and grammar only/i);
    expect(system).toMatch(/as close to the original/i);
  });

  it("note latitude: grammar + light restructure, no summarisation", () => {
    const { system } = buildPolishPrompt("note", "x");
    expect(system).toContain("NOTE");
    expect(system).toMatch(/restructure/i);
    expect(system).toMatch(/Do not summarise/i);
  });

  it("idea latitude: may condense and rephrase, never invent specifics", () => {
    const { system } = buildPolishPrompt("idea", "x");
    expect(system).toContain("IDEA");
    expect(system).toMatch(/condense/i);
    expect(system).toMatch(/never invent/i);
  });
});
