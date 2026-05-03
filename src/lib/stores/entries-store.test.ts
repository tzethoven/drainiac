import { describe, it, expect, vi } from "vitest";
import { createEntriesStore } from "./entries-store.svelte";
import { createFakeStorage } from "./fake-storage";
import type {
  PolishClient,
  PolishRequest,
} from "$lib/polish/polish-client";
import type { PolishResult } from "$lib/polish/types";

/**
 * Minimal fake for the polish seam. Resolves the in-flight request
 * with whatever `result` is set at the time of `resolve()`, so tests
 * can (a) reason about what `PolishResult` the store sees, not what
 * bytes crossed the wire, and (b) control in-flight timing for
 * conflict tests without building `Response` objects.
 */
function createFakePolishClient(): {
  client: PolishClient;
  calls: PolishRequest[];
  pending: number;
  resolveNext(result: PolishResult): void;
  resolveAllWith(result: PolishResult): void;
} {
  const calls: PolishRequest[] = [];
  const resolvers: Array<(r: PolishResult) => void> = [];
  return {
    calls,
    get pending() {
      return resolvers.length;
    },
    client: {
      polish(req) {
        calls.push(req);
        return new Promise<PolishResult>((resolve) => {
          resolvers.push(resolve);
        });
      },
    },
    resolveNext(result) {
      const r = resolvers.shift();
      if (!r) throw new Error("no pending polish call to resolve");
      r(result);
    },
    resolveAllWith(result) {
      while (resolvers.length) resolvers.shift()!(result);
    },
  };
}

/** Eagerly-resolving fake — simpler for the synchronous happy path. */
function immediateClient(result: PolishResult): {
  client: PolishClient;
  calls: PolishRequest[];
} {
  const calls: PolishRequest[] = [];
  return {
    calls,
    client: {
      async polish(req) {
        calls.push(req);
        return result;
      },
    },
  };
}

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
      schemaVersion: 3,
      category: "note",
      displayText: "Remember this.",
      rawTranscript: "note remember this",
      source: "voice",
      done: false,
      createdAt: 12_345,
      updatedAt: 12_345,
      polish: null,
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
    expect(second.entries[0].schemaVersion).toBe(3);
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

  it("update() merges a polish-clearing patch (polish: null)", () => {
    const deps = makeDeps();
    deps.setNow(1_000);
    const store = createEntriesStore(deps);
    const entry = store.add({
      category: "todo",
      displayText: "buy milk",
      rawTranscript: "todo buy milk",
    });

    // Simulate a prior polish by patching `polish` directly through
    // the widened update signature.
    deps.setNow(2_000);
    store.update(entry.id, {
      polish: {
        text: "Buy milk.",
        at: 2_000,
        model: "test-model",
        promptVersion: 1,
      },
    });
    expect(store.entries[0].polish).toEqual({
      text: "Buy milk.",
      at: 2_000,
      model: "test-model",
      promptVersion: 1,
    });

    // Now clear the polish via the same path (the revert operation).
    deps.setNow(3_000);
    store.update(entry.id, { polish: null });

    const after = store.entries[0];
    expect(after.polish).toBeNull();
    expect(after.updatedAt).toBe(3_000);
    expect(after.displayText).toBe("buy milk");
    expect(after.rawTranscript).toBe("todo buy milk");
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
      schemaVersion: 3,
      category: "todo",
      displayText: "Buy milk.",
      rawTranscript: "todo buy milk",
      source: "voice",
      done: true,
      createdAt: 1_000,
      updatedAt: 2_000,
      polish: null,
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
    it("upgrades a v1-shaped localStorage blob straight to v3 entries in the store", () => {
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
      expect(store.entries[0].schemaVersion).toBe(3);
      expect(store.entries[0].polish).toBeNull();
    });

    it("eagerly persists v1 → v3 upgrade back to storage on first load", () => {
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
      expect(persisted[0].schemaVersion).toBe(3);
      expect(persisted[0].polish).toBeNull();
    });

    it("does not rewrite storage when every entry is already v3", () => {
      const deps = makeDeps();
      const store1 = createEntriesStore(deps);
      store1.add({ category: "todo", displayText: "A.", rawTranscript: "todo a" });

      const blobBefore = deps.storage.getItem("memento:entries")!;

      // Spy on setItem to ensure no write happens on pure-v3 load.
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

  describe("polish()", () => {
    it("happy path: writes the grouped polish field", async () => {
      const deps = makeDeps();
      deps.setNow(1_000);
      const fake = immediateClient({
        ok: true,
        polishedText: "Buy milk.",
        model: "test-model",
        promptVersion: 1,
      });
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "buy milk",
        rawTranscript: "todo buy milk",
      });

      deps.setNow(2_000);
      await store.polish(entry.id);

      const after = store.entries[0];
      expect(after.polish).toEqual({
        text: "Buy milk.",
        at: 2_000,
        model: "test-model",
        promptVersion: 1,
      });
      expect(store.isPolishing(entry.id)).toBe(false);
      expect(fake.calls).toEqual([
        { rawTranscript: "todo buy milk", category: "todo" },
      ]);
    });

    it("isPolishing(id) is true while the request is in flight", async () => {
      const deps = makeDeps();
      const fake = createFakePolishClient();
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      const promise = store.polish(entry.id);
      expect(store.isPolishing(entry.id)).toBe(true);

      fake.resolveNext({ ok: true, polishedText: "X.", model: "m", promptVersion: 1 });
      await promise;
      expect(store.isPolishing(entry.id)).toBe(false);
    });

    it("is a no-op when already polishing", async () => {
      const deps = makeDeps();
      const fake = createFakePolishClient();
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      const first = store.polish(entry.id);
      await store.polish(entry.id); // second call no-ops immediately
      expect(fake.calls).toHaveLength(1);

      fake.resolveNext({ ok: true, polishedText: "X.", model: "m", promptVersion: 1 });
      await first;
    });

    it("is a no-op when the entry already has polish set", async () => {
      const deps = makeDeps();
      const fake = immediateClient({
        ok: true,
        polishedText: "First.",
        model: "m",
        promptVersion: 1,
      });
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      await store.polish(entry.id);
      expect(fake.calls).toHaveLength(1);
      await store.polish(entry.id); // second call no-ops — already polished
      expect(fake.calls).toHaveLength(1);
    });

    it("edit-during-flight discards the eventual response", async () => {
      const deps = makeDeps();
      const fake = createFakePolishClient();
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      const promise = store.polish(entry.id);
      store.update(entry.id, { displayText: "edited" });
      expect(store.isPolishing(entry.id)).toBe(false);

      fake.resolveNext({
        ok: true,
        polishedText: "Should be discarded.",
        model: "m",
        promptVersion: 1,
      });
      await promise;

      expect(store.entries[0].polish).toBeNull();
      expect(store.entries[0].displayText).toBe("edited");
    });

    it("delete-during-flight discards the eventual response", async () => {
      const deps = makeDeps();
      const fake = createFakePolishClient();
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      const promise = store.polish(entry.id);
      store.remove(entry.id);

      fake.resolveNext({
        ok: true,
        polishedText: "Should be discarded.",
        model: "m",
        promptVersion: 1,
      });
      await promise;

      expect(store.entries).toHaveLength(0);
    });

    it("calls onPolishError and leaves the entry unchanged on upstream failure", async () => {
      // The adapter converts network throws to `upstream`. From the
      // store's perspective there's no difference; all it sees is a
      // typed `PolishResult`.
      const deps = makeDeps();
      const fake = immediateClient({ ok: false, reason: "upstream", status: 0 });
      const onPolishError = vi.fn();
      const store = createEntriesStore({
        ...deps,
        polishClient: fake.client,
        onPolishError,
      });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      await store.polish(entry.id);

      expect(onPolishError).toHaveBeenCalledWith("upstream");
      expect(store.isPolishing(entry.id)).toBe(false);
      expect(store.entries[0].polish).toBeNull();
    });

    it("routes { ok: false; reason: 'rate-limited' } to onPolishError('rate-limited')", async () => {
      const deps = makeDeps();
      const fake = immediateClient({ ok: false, reason: "rate-limited" });
      const onPolishError = vi.fn();
      const store = createEntriesStore({
        ...deps,
        polishClient: fake.client,
        onPolishError,
      });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      await store.polish(entry.id);

      expect(onPolishError).toHaveBeenCalledWith("rate-limited");
      expect(store.isPolishing(entry.id)).toBe(false);
    });

    it("forwards retryAfterMs to onPolishError when present on the result", async () => {
      const deps = makeDeps();
      const fake = immediateClient({
        ok: false,
        reason: "rate-limited",
        retryAfterMs: 2000,
      });
      const onPolishError = vi.fn();
      const store = createEntriesStore({
        ...deps,
        polishClient: fake.client,
        onPolishError,
      });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "todo x",
      });

      await store.polish(entry.id);

      expect(onPolishError).toHaveBeenCalledWith("rate-limited", { retryAfterMs: 2000 });
    });

    it("routes each failure reason straight through to onPolishError", async () => {
      const cases: PolishResult[] = [
        { ok: false, reason: "timeout" },
        { ok: false, reason: "quota-exhausted" },
        { ok: false, reason: "too-long" },
        { ok: false, reason: "bad-request" },
        { ok: false, reason: "upstream", status: 500 },
      ];
      for (const result of cases) {
        const deps = makeDeps();
        const fake = immediateClient(result);
        const onPolishError = vi.fn();
        const store = createEntriesStore({
          ...deps,
          polishClient: fake.client,
          onPolishError,
        });
        const entry = store.add({
          category: "todo",
          displayText: "x",
          rawTranscript: "todo x",
        });
        await store.polish(entry.id);
        if (result.ok) continue;
        expect(onPolishError).toHaveBeenCalledWith(result.reason);
      }
    });

    it("short-circuits oversized transcripts without calling the client", async () => {
      const deps = makeDeps();
      const fake = immediateClient({
        ok: true,
        polishedText: "x",
        model: "m",
        promptVersion: 1,
      });
      const onPolishError = vi.fn();
      const store = createEntriesStore({
        ...deps,
        polishClient: fake.client,
        onPolishError,
      });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "a".repeat(4001),
      });

      await store.polish(entry.id);

      expect(fake.calls).toHaveLength(0);
      expect(onPolishError).toHaveBeenCalledWith("too-long");
      expect(store.isPolishing(entry.id)).toBe(false);
      expect(store.entries[0].polish).toBeNull();
    });

    it("does not short-circuit at exactly the 4000-char limit", async () => {
      const deps = makeDeps();
      const fake = immediateClient({
        ok: true,
        polishedText: "ok",
        model: "m",
        promptVersion: 1,
      });
      const store = createEntriesStore({ ...deps, polishClient: fake.client });
      const entry = store.add({
        category: "todo",
        displayText: "x",
        rawTranscript: "a".repeat(4000),
      });
      await store.polish(entry.id);
      expect(fake.calls).toHaveLength(1);
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
