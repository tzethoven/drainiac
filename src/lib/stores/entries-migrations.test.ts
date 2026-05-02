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

function makeV2(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id-v2",
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

describe("CURRENT_SCHEMA_VERSION", () => {
  it("is 2", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
  });
});

describe("migrate()", () => {
  it("upgrades a v1 entry to v2 with the four polish fields set to null", () => {
    const v1 = makeV1();

    const result = migrate(v1);

    expect(result).toEqual({
      id: "id-v1",
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
    });
  });

  it("preserves optional v1 fields (processedAt, warning) through the upgrade", () => {
    const v1 = makeV1({
      processedAt: 5_000,
      warning: "partial-transcription",
    });

    const result = migrate(v1);

    expect(result).not.toBeNull();
    expect(result!.processedAt).toBe(5_000);
    expect(result!.warning).toBe("partial-transcription");
    expect(result!.schemaVersion).toBe(2);
  });

  it("returns a v2 entry unchanged (idempotent)", () => {
    const v2 = makeV2();

    const result = migrate(v2);

    expect(result).toEqual(v2);
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
  it("migrates a mix of v1 and v2 entries, reporting changed=true", () => {
    const v1 = makeV1({ id: "a" });
    const v2 = makeV2({ id: "b" });

    const { entries, changed } = migrateAll([v1, v2]);

    expect(entries).toHaveLength(2);
    expect(entries[0].id).toBe("a");
    expect(entries[0].schemaVersion).toBe(2);
    expect(entries[0].polishedText).toBeNull();
    expect(entries[1].id).toBe("b");
    expect(changed).toBe(true);
  });

  it("reports changed=false when every entry is already v2", () => {
    const { entries, changed } = migrateAll([
      makeV2({ id: "a" }),
      makeV2({ id: "b" }),
    ]);

    expect(entries).toHaveLength(2);
    expect(changed).toBe(false);
  });

  it("drops malformed entries and flags changed=true", () => {
    const { entries, changed } = migrateAll([
      makeV2({ id: "keep" }),
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
