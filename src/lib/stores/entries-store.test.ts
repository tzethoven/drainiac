import { describe, it, expect } from "vitest";
import { createEntriesStore } from "./entries-store.svelte";
import { createFakeStorage } from "./fake-storage";

function makeDeps() {
  let nowValue = 1_000;
  let idCounter = 0;
  return {
    storage: createFakeStorage(),
    now: () => nowValue,
    idFactory: () => `id-${++idCounter}`,
    setNow: (v: number) => {
      nowValue = v;
    },
  };
}

describe("entries-store", () => {
  it("add() inserts an entry that is readable via the reactive entries list", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);

    const entry = store.add({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
    });

    expect(entry.id).toBe("id-1");
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]).toEqual(entry);
  });

  it("add() writes all schema fields with defaults, and no processedAt", () => {
    const deps = makeDeps();
    deps.setNow(12_345);
    const store = createEntriesStore(deps);

    const entry = store.add({
      category: "note",
      displayText: "Remember this.",
      rawTranscript: "note remember this",
    });

    expect(entry).toEqual({
      id: "id-1",
      schemaVersion: 2,
      category: "note",
      displayText: "Remember this.",
      rawTranscript: "note remember this",
      source: "voice",
      done: false,
      createdAt: 12_345,
      updatedAt: 12_345,
      polishedText: null,
      polishedAt: null,
      polishedModel: null,
      polishedPromptVersion: null,
    });
    expect("processedAt" in entry).toBe(false);
  });

  it("lists entries newest-first", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);

    deps.setNow(1_000);
    store.add({ category: "todo", displayText: "First.", rawTranscript: "todo first" });
    deps.setNow(2_000);
    store.add({ category: "note", displayText: "Second.", rawTranscript: "note second" });
    deps.setNow(3_000);
    store.add({ category: "idea", displayText: "Third.", rawTranscript: "idea third" });

    expect(store.entries.map((e) => e.displayText)).toEqual([
      "Third.",
      "Second.",
      "First.",
    ]);
  });

  it("persists entries to storage and rehydrates a new instance", () => {
    const deps = makeDeps();
    const first = createEntriesStore(deps);
    first.add({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
    });

    // New instance, same storage.
    const second = createEntriesStore({ storage: deps.storage });

    expect(second.entries).toHaveLength(1);
    expect(second.entries[0].displayText).toBe("Buy milk.");
    expect(second.entries[0].category).toBe("todo");
    expect(second.entries[0].schemaVersion).toBe(2);
  });

  it("update() mutates allowed fields and bumps updatedAt without changing createdAt", () => {
    const deps = makeDeps();
    deps.setNow(1_000);
    const store = createEntriesStore(deps);
    const entry = store.add({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
    });

    deps.setNow(5_000);
    store.update(entry.id, { displayText: "Buy oat milk.", done: true, category: "note" });

    const updated = store.entries[0];
    expect(updated.id).toBe(entry.id);
    expect(updated.displayText).toBe("Buy oat milk.");
    expect(updated.done).toBe(true);
    expect(updated.category).toBe("note");
    expect(updated.createdAt).toBe(1_000);
    expect(updated.updatedAt).toBe(5_000);
    // rawTranscript is immutable — must not be touched.
    expect(updated.rawTranscript).toBe("todo buy milk");
  });

  it("remove() deletes the entry with the given id", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);
    const a = store.add({ category: "todo", displayText: "A.", rawTranscript: "todo a" });
    const b = store.add({ category: "note", displayText: "B.", rawTranscript: "note b" });

    store.remove(a.id);

    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].id).toBe(b.id);
  });

  it("clearDone() removes only entries where done === true, across all categories", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);
    const a = store.add({ category: "todo", displayText: "A.", rawTranscript: "todo a" });
    const b = store.add({ category: "note", displayText: "B.", rawTranscript: "note b" });
    const c = store.add({ category: "idea", displayText: "C.", rawTranscript: "idea c" });
    const d = store.add({ category: "todo", displayText: "D.", rawTranscript: "todo d" });

    store.update(a.id, { done: true });
    store.update(c.id, { done: true });

    store.clearDone();

    const remaining = store.entries.map((e) => e.id);
    expect(remaining).toHaveLength(2);
    expect(remaining).toContain(b.id);
    expect(remaining).toContain(d.id);
    expect(remaining).not.toContain(a.id);
    expect(remaining).not.toContain(c.id);
  });

  describe("restore()", () => {
    it("makes the entry appear in entries", () => {
      const deps = makeDeps();
      const store = createEntriesStore(deps);
      const entry = store.add({ category: "todo", displayText: "Buy milk.", rawTranscript: "todo buy milk" });
      store.remove(entry.id);
      expect(store.entries).toHaveLength(0);

      store.restore(entry);

      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].id).toBe(entry.id);
    });

    it("preserves all original fields exactly", () => {
      const deps = makeDeps();
      deps.setNow(9_999);
      const store = createEntriesStore(deps);
      const entry = store.add({ category: "idea", displayText: "Great idea.", rawTranscript: "idea great idea" });
      store.remove(entry.id);

      store.restore(entry);

      expect(store.entries[0]).toEqual(entry);
    });

    it("re-inserts at the correct createdAt-desc position among existing entries", () => {
      const deps = makeDeps();
      const store = createEntriesStore(deps);

      deps.setNow(1_000);
      const first = store.add({ category: "todo", displayText: "First.", rawTranscript: "todo first" });
      deps.setNow(2_000);
      store.add({ category: "note", displayText: "Second.", rawTranscript: "note second" });
      deps.setNow(3_000);
      store.add({ category: "idea", displayText: "Third.", rawTranscript: "idea third" });

      store.remove(first.id);
      store.restore(first);

      expect(store.entries.map((e) => e.displayText)).toEqual(["Third.", "Second.", "First."]);
    });

    it("persists the restored entry so a new store instance can read it", () => {
      const deps = makeDeps();
      const store = createEntriesStore(deps);
      const entry = store.add({ category: "todo", displayText: "Buy milk.", rawTranscript: "todo buy milk" });
      store.remove(entry.id);
      store.restore(entry);

      const second = createEntriesStore({ storage: deps.storage });

      expect(second.entries).toHaveLength(1);
      expect(second.entries[0]).toEqual(entry);
    });
  });

  it("byCategory() returns only entries of the given category, reactively", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);
    store.add({ category: "todo", displayText: "T1.", rawTranscript: "todo t1" });
    store.add({ category: "note", displayText: "N1.", rawTranscript: "note n1" });
    store.add({ category: "todo", displayText: "T2.", rawTranscript: "todo t2" });
    store.add({ category: "idea", displayText: "I1.", rawTranscript: "idea i1" });

    expect(store.byCategory("todo").map((e) => e.displayText)).toEqual(["T2.", "T1."]);
    expect(store.byCategory("note").map((e) => e.displayText)).toEqual(["N1."]);
    expect(store.byCategory("idea").map((e) => e.displayText)).toEqual(["I1."]);

    store.add({ category: "todo", displayText: "T3.", rawTranscript: "todo t3" });
    expect(store.byCategory("todo").map((e) => e.displayText)).toEqual([
      "T3.",
      "T2.",
      "T1.",
    ]);
  });

  it("localStorage round-trip preserves all fields, with processedAt absent", () => {
    const deps = makeDeps();
    deps.setNow(1_000);
    const first = createEntriesStore(deps);
    const entry = first.add({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
    });
    deps.setNow(2_000);
    first.update(entry.id, { done: true });

    const second = createEntriesStore({ storage: deps.storage });
    const rehydrated = second.entries[0];

    expect(rehydrated).toEqual({
      id: entry.id,
      schemaVersion: 2,
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
      source: "voice",
      done: true,
      createdAt: 1_000,
      updatedAt: 2_000,
      polishedText: null,
      polishedAt: null,
      polishedModel: null,
      polishedPromptVersion: null,
    });
    expect("processedAt" in rehydrated).toBe(false);
  });

  it("add() with warning='partial-transcription' round-trips the flag", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);

    const entry = store.add({
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
      warning: "partial-transcription",
    });

    expect(entry.warning).toBe("partial-transcription");
    expect(store.entries[0].warning).toBe("partial-transcription");
  });

  it("add() without warning leaves the field undefined", () => {
    const deps = makeDeps();
    const store = createEntriesStore(deps);

    const entry = store.add({
      category: "note",
      displayText: "Hello.",
      rawTranscript: "note hello",
    });

    expect(entry.warning).toBeUndefined();
  });

  describe("migration on load", () => {
    it("upgrades a v1-shaped localStorage blob to v2 entries in the store", () => {
      const deps = makeDeps();
      const v1 = {
        id: "legacy-1",
        schemaVersion: 1,
        category: "todo",
        displayText: "Old entry.",
        rawTranscript: "todo old entry",
        source: "voice",
        done: false,
        createdAt: 100,
        updatedAt: 100,
      };
      deps.storage.setItem("memento:entries", JSON.stringify([v1]));

      const store = createEntriesStore(deps);

      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].schemaVersion).toBe(2);
      expect(store.entries[0].polishedText).toBeNull();
      expect(store.entries[0].polishedAt).toBeNull();
      expect(store.entries[0].polishedModel).toBeNull();
      expect(store.entries[0].polishedPromptVersion).toBeNull();
    });

    it("eagerly persists v1 → v2 upgrade back to storage on first load", () => {
      const deps = makeDeps();
      const v1 = {
        id: "legacy-1",
        schemaVersion: 1,
        category: "todo",
        displayText: "Old entry.",
        rawTranscript: "todo old entry",
        source: "voice",
        done: false,
        createdAt: 100,
        updatedAt: 100,
      };
      deps.storage.setItem("memento:entries", JSON.stringify([v1]));

      createEntriesStore(deps);

      const persisted = JSON.parse(deps.storage.getItem("memento:entries")!);
      expect(persisted).toHaveLength(1);
      expect(persisted[0].schemaVersion).toBe(2);
      expect(persisted[0].polishedText).toBeNull();
    });

    it("does not rewrite storage when every entry is already v2", () => {
      const deps = makeDeps();
      const store1 = createEntriesStore(deps);
      store1.add({ category: "todo", displayText: "A.", rawTranscript: "todo a" });

      const blobBefore = deps.storage.getItem("memento:entries")!;

      // Spy on setItem to ensure no write happens on pure-v2 load.
      let writes = 0;
      const originalSetItem = deps.storage.setItem.bind(deps.storage);
      deps.storage.setItem = (k: string, v: string) => {
        writes++;
        originalSetItem(k, v);
      };

      createEntriesStore({ storage: deps.storage });

      expect(writes).toBe(0);
      expect(deps.storage.getItem("memento:entries")).toBe(blobBefore);
    });

    it("drops malformed entries from storage and persists the cleaned list", () => {
      const deps = makeDeps();
      const v1 = {
        id: "good",
        schemaVersion: 1,
        category: "todo",
        displayText: "Keep me.",
        rawTranscript: "todo keep me",
        source: "voice",
        done: false,
        createdAt: 100,
        updatedAt: 100,
      };
      const bad = { id: "bad", schemaVersion: 999 };
      deps.storage.setItem(
        "memento:entries",
        JSON.stringify([v1, bad, null, "nonsense"]),
      );

      const store = createEntriesStore(deps);

      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].id).toBe("good");
      const persisted = JSON.parse(deps.storage.getItem("memento:entries")!);
      expect(persisted).toHaveLength(1);
      expect(persisted[0].id).toBe("good");
    });
  });

  it("localStorage round-trip preserves the warning flag", () => {
    const deps = makeDeps();
    const first = createEntriesStore(deps);
    first.add({
      category: "todo",
      displayText: "X.",
      rawTranscript: "todo x",
      warning: "partial-transcription",
    });

    const second = createEntriesStore({ storage: deps.storage });

    expect(second.entries[0].warning).toBe("partial-transcription");
  });
});
