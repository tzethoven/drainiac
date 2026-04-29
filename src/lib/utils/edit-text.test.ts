import { describe, it, expect } from "vitest";
import { normalizeEditText, isBlank } from "./edit-text";

describe("normalizeEditText", () => {
  it("returns empty string unchanged", () => {
    expect(normalizeEditText("")).toBe("");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeEditText("  buy milk  ")).toBe("buy milk");
    expect(normalizeEditText("\n\thello\n")).toBe("hello");
  });

  it("collapses internal whitespace to a single space", () => {
    expect(normalizeEditText("buy   milk")).toBe("buy milk");
    expect(normalizeEditText("a\t\tb\n\nc")).toBe("a b c");
  });

  it("leaves already-normalized text untouched", () => {
    expect(normalizeEditText("buy milk")).toBe("buy milk");
    expect(normalizeEditText("a b c")).toBe("a b c");
  });

  it("does not capitalize or append punctuation", () => {
    expect(normalizeEditText("iPhone reminder")).toBe("iPhone reminder");
    expect(normalizeEditText("groceries")).toBe("groceries");
  });
});

describe("isBlank", () => {
  it("is true for empty string", () => {
    expect(isBlank("")).toBe(true);
  });

  it("is true for whitespace-only strings", () => {
    expect(isBlank("   ")).toBe(true);
    expect(isBlank("\n\t  \n")).toBe(true);
  });

  it("is false for strings with any non-whitespace content", () => {
    expect(isBlank("x")).toBe(false);
    expect(isBlank("  x  ")).toBe(false);
    expect(isBlank("hello world")).toBe(false);
  });
});
