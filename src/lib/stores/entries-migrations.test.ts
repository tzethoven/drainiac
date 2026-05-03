import { describe, it, expect } from "vitest";
import { migrate, migrateAll, CURRENT_SCHEMA_VERSION } from "./entries-migrations";
import type { Entry } from "./entries-store.svelte";

function makeV1(overrides: Record<string, unknown> = {}) {
  return {
    id: "id-v1",
    schemaVersion: 1 as const,
    category: "todo" as const,
    displayText: "Buy milk.",
    rawTranscript: "todo buy milk",
    source: "voice" as const,
    done: false,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

function makeV2(overrides: Record<string, unknown> = {}) {
  return {
    id: "id-v2",
    schemaVersion: 2 as const,
    category: "todo" as const,
    displayText: "Buy milk.",
    rawTranscript: "todo buy milk",
    source: "voice" as const,
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

function makeV3(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id-v3",
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

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is 3", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
  });
});

describe("migrate()", () => {
  it("upgrades a v1 entry straight to v3 with polish: null", () => {
    const v1 = makeV1();

    const result = migrate(v1);

    expect(result).toEqual({
      id: "id-v1",
      schemaVersion: 3,
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
      source: "voice",
      done: false,
      createdAt: 1_000,
      updatedAt: 1_000,
      polish: null,
    });
  });

  it("preserves optional v1 fields (processedAt, warning) through the upgrade", () => {
    const v1 = makeV1({ processedAt: 5_000, warning: "partial-transcription" });

    const result = migrate(v1);

    expect(result).not.toBeNull();
    expect(result!.processedAt).toBe(5_000);
    expect(result!.warning).toBe("partial-transcription");
    expect(result!.schemaVersion).toBe(3);
  });

  it("collapses a polished v2 entry's quartet into the grouped polish field", () => {
    const v2 = makeV2({
      polishedText: "Buy milk.",
      polishedAt: 2_000,
      polishedModel: "test-model",
      polishedPromptVersion: 1,
    });

    const result = migrate(v2);

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(3);
    expect(result!.polish).toEqual({
      text: "Buy milk.",
      at: 2_000,
      model: "test-model",
      promptVersion: 1,
    });
    // Quartet fields no longer present on the v3 shape.
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "polishedText",
    );
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "polishedAt",
    );
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "polishedModel",
    );
    expect(result as unknown as Record<string, unknown>).not.toHaveProperty(
      "polishedPromptVersion",
    );
  });

  it("treats an unpolished v2 entry (all four fields null) as polish: null", () => {
    const v2 = makeV2();

    const result = migrate(v2);

    expect(result).not.toBeNull();
    expect(result!.schemaVersion).toBe(3);
    expect(result!.polish).toBeNull();
  });

  it("defensively treats a partially-populated v2 quartet as polish: null", () => {
    // The invariant says this shouldn't exist in the wild, but if
    // corrupt data slips through we should not emit a half-formed
    // Polish value.
    const v2 = makeV2({
      polishedText: "Buy milk.",
      polishedAt: null,
      polishedModel: "m",
      polishedPromptVersion: 1,
    });

    const result = migrate(v2);

    expect(result).not.toBeNull();
    expect(result!.polish).toBeNull();
  });

  it("returns a v3 entry unchanged (idempotent)", () => {
    const v3 = makeV3();

    const result = migrate(v3);

    expect(result).toEqual(v3);
  });

  it("returns null for entries with unknown schemaVersion", () => {
    expect(migrate({ id: "x", schemaVersion: 999 })).toBeNull();
    expect(migrate({ id: "x" })).toBeNull();
    expect(migrate({ id: "x", schemaVersion: "1" })).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(migrate(null)).toBeNull();
    expect(migrate(undefined)).toBeNull();
    expect(migrate("string")).toBeNull();
    expect(migrate(42)).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ schemaVersion: 1 })).toBeNull(); // missing id
  });
});

describe("migrateAll()", () => {
  it("migrates a mix of v1, v2, and v3 entries, reporting changed=true", () => {
    const v1 = makeV1({ id: "a" });
    const v2 = makeV2({ id: "b" });
    const v3 = makeV3({ id: "c" });

    const { entries, changed } = migrateAll([v1, v2, v3]);

    expect(entries).toHaveLength(3);
    expect(entries[0].id).toBe("a");
    expect(entries[0].schemaVersion).toBe(3);
    expect(entries[0].polish).toBeNull();
    expect(entries[1].id).toBe("b");
    expect(entries[1].schemaVersion).toBe(3);
    expect(entries[2].id).toBe("c");
    expect(changed).toBe(true);
  });

  it("reports changed=false when every entry is already v3", () => {
    const { entries, changed } = migrateAll([
      makeV3({ id: "a" }),
      makeV3({ id: "b" }),
    ]);

    expect(entries).toHaveLength(2);
    expect(changed).toBe(false);
  });

  it("drops malformed entries and flags changed=true", () => {
    const { entries, changed } = migrateAll([
      makeV3({ id: "keep" }),
      { id: "bad", schemaVersion: 999 },
      null,
      "nonsense",
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("keep");
    expect(changed).toBe(true);
  });

  it("handles an empty array with changed=false", () => {
    const { entries, changed } = migrateAll([]);
    expect(entries).toEqual([]);
    expect(changed).toBe(false);
  });
});
