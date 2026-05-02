import type { Category } from "$lib/utils/transcript-parser";
import { getContext, setContext } from "svelte";
import { CURRENT_SCHEMA_VERSION, migrateAll } from "./entries-migrations";

export interface Entry {
  id: string;
  schemaVersion: 2;
  category: Category;
  displayText: string;
  rawTranscript: string;
  source: "voice" | "text";
  done: boolean;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  warning?: "partial-transcription";
  /** AI-polished form of the entry. `null` when not polished or reverted. */
  polishedText: string | null;
  /** Timestamp of the last successful polish. `null` when not polished. */
  polishedAt: number | null;
  /** Gemini model id used for the polish, e.g. `gemini-3.1-flash-lite-preview`. */
  polishedModel: string | null;
  /** Prompt template version used for the polish. */
  polishedPromptVersion: number | null;
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
  const storageKey = options.storageKey ?? "memento:entries";

  const loaded = loadInitial(storage, storageKey);
  let entries = $state<Entry[]>(loaded.entries);

  function persist() {
    if (!storage) return;
    storage.setItem(storageKey, JSON.stringify(entries));
  }

  // Eagerly persist migrated entries so storage is consistently
  // current-schema-shaped from first load onward. Runs once per store.
  if (loaded.changed) persist();

  function add(input: AddInput): Entry {
    const ts = now();
    const entry: Entry = {
      id: idFactory(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      category: input.category,
      displayText: input.displayText,
      rawTranscript: input.rawTranscript,
      source: input.source ?? "voice",
      done: false,
      createdAt: ts,
      updatedAt: ts,
      polishedText: null,
      polishedAt: null,
      polishedModel: null,
      polishedPromptVersion: null,
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

function loadInitial(
  storage: Storage | undefined,
  key: string,
): { entries: Entry[]; changed: boolean } {
  if (!storage) return { entries: [], changed: false };
  const raw = storage.getItem(key);
  if (!raw) return { entries: [], changed: false };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { entries: [], changed: false };
    return migrateAll(parsed);
  } catch {
    return { entries: [], changed: false };
  }
}

const ENTRIES_CONTEXT_KEY = Symbol("memento:entries-store");

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
