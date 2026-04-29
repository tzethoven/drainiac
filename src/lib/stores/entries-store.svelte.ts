import type { Category } from "$lib/utils/transcript-parser";
import { getContext, setContext } from "svelte";

export interface Entry {
  id: string;
  schemaVersion: 1;
  category: Category;
  displayText: string;
  rawTranscript: string;
  source: "voice" | "text";
  done: boolean;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  warning?: "partial-transcription";
}

export interface AddInput {
  category: Category;
  displayText: string;
  rawTranscript: string;
  source?: "voice" | "text";
  warning?: "partial-transcription";
}

export interface EntriesStoreOptions {
  storage?: Storage;
  now?: () => number;
  idFactory?: () => string;
  storageKey?: string;
}

export interface EntriesStore {
  readonly entries: Entry[];
  byCategory(category: Category): Entry[];
  add(input: AddInput): Entry;
  update(
    id: string,
    patch: Partial<Pick<Entry, "displayText" | "category" | "done">>,
  ): void;
  remove(id: string): void;
  restore(entry: Entry): void;
  clearDone(): void;
}

export function createEntriesStore(
  options: EntriesStoreOptions = {},
): EntriesStore {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const storage = options.storage;
  const storageKey = options.storageKey ?? "drainiac:entries";

  let entries = $state<Entry[]>(loadInitial(storage, storageKey));

  function persist() {
    if (!storage) return;
    storage.setItem(storageKey, JSON.stringify(entries));
  }

  function add(input: AddInput): Entry {
    const ts = now();
    const entry: Entry = {
      id: idFactory(),
      schemaVersion: 1,
      category: input.category,
      displayText: input.displayText,
      rawTranscript: input.rawTranscript,
      source: input.source ?? "voice",
      done: false,
      createdAt: ts,
      updatedAt: ts,
      ...(input.warning ? { warning: input.warning } : {}),
    };
    entries = [entry, ...entries];
    persist();
    return entry;
  }

  function update(
    id: string,
    patch: Partial<Pick<Entry, "displayText" | "category" | "done">>,
  ): void {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const current = entries[idx];
    const next: Entry = { ...current, ...patch, updatedAt: now() };
    entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
    persist();
  }

  function remove(id: string): void {
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return;
    entries = next;
    persist();
  }

  function restore(entry: Entry): void {
    entries = [...entries, entry].sort((a, b) => b.createdAt - a.createdAt);
    persist();
  }

  function clearDone(): void {
    const next = entries.filter((e) => !e.done);
    if (next.length === entries.length) return;
    entries = next;
    persist();
  }

  return {
    get entries() {
      return entries;
    },
    byCategory(category: Category) {
      return entries.filter((e) => e.category === category);
    },
    add,
    update,
    remove,
    restore,
    clearDone,
  };
}

function loadInitial(storage: Storage | undefined, key: string): Entry[] {
  if (!storage) return [];
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

const ENTRIES_CONTEXT_KEY = Symbol("drainiac:entries-store");

export function setEntriesContext(store: EntriesStore): EntriesStore {
  setContext(ENTRIES_CONTEXT_KEY, store);
  return store;
}

export function getEntriesContext(): EntriesStore {
  const store = getContext<EntriesStore | undefined>(ENTRIES_CONTEXT_KEY);
  if (!store) {
    throw new Error(
      "No entries store in context. Wrap the component tree with a provider that calls setEntriesContext().",
    );
  }
  return store;
}
