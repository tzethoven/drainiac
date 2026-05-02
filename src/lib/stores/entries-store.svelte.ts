import type { Category } from "$lib/utils/transcript-parser";
import { getContext, setContext } from "svelte";
import { CURRENT_SCHEMA_VERSION, migrateAll } from "./entries-migrations";
import {
  MAX_POLISH_TRANSCRIPT_CHARS,
  type PolishFailureReason,
} from "$lib/polish/types";

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

/**
 * Fields the app is allowed to patch through `update()`. User-editable
 * content (`displayText`, `category`, `done`) plus the four polish
 * metadata fields, which are patched together when an edit clears a
 * polish or the user reverts to original. `updatedAt` is always
 * stamped by the store itself.
 */
export type EntryUpdatePatch = Partial<
  Pick<Entry, "displayText" | "category" | "done"> & {
    polishedText: string | null;
    polishedAt: number | null;
    polishedModel: string | null;
    polishedPromptVersion: number | null;
  }
>;

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
  /** Override for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /**
   * Optional hook called when the polish request fails. The `reason`
   * is the server-taxonomy discriminant (see `$lib/polish/types`) so
   * the adapter can map to the right toast copy without the store
   * importing the toast store. Not called when the request is
   * discarded because the entry was edited or removed while in flight.
   *
   * `retryAfterMs` is forwarded verbatim from the server when present
   * on `rate-limited` / `quota-exhausted`. Slice #4 does not render a
   * countdown; the parameter keeps the seam open for future UI.
   */
  onPolishError?: (
    reason: PolishFailureReason,
    details?: { retryAfterMs?: number },
  ) => void;
}

export interface EntriesStore {
  readonly entries: Entry[];
  byCategory(category: Category): Entry[];
  add(input: AddInput): Entry;
  update(id: string, patch: EntryUpdatePatch): void;
  remove(id: string): void;
  restore(entry: Entry): void;
  clearDone(): void;
  /**
   * Trigger an AI polish for the given entry. No-op if the entry is
   * already polishing or already has `polishedText`. On success the
   * four polish fields are applied via the normal update path; on
   * failure `onPolishError` is called and the entry is left unchanged.
   * If `update(id, …)` or `remove(id)` is called while the request is
   * in flight, the eventual response is discarded silently.
   */
  polish(id: string): Promise<void>;
  /** Reactive: true iff a polish request is in flight for `id`. */
  isPolishing(id: string): boolean;
}

export function createEntriesStore(
  options: EntriesStoreOptions = {},
): EntriesStore {
  const now = options.now ?? Date.now;
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const storage = options.storage;
  const storageKey = options.storageKey ?? "memento:entries";

  const fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  const onPolishError = options.onPolishError;

  const loaded = loadInitial(storage, storageKey);
  let entries = $state<Entry[]>(loaded.entries);

  // Set of entry ids with an in-flight polish request. Membership
  // doubles as the conflict detector: `update` and `remove` both call
  // `polishingIds.delete(id)` unconditionally, which causes any
  // in-flight response to be discarded when it returns.
  const polishingIds = $state(new Set<string>());

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

  function update(id: string, patch: EntryUpdatePatch): void {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    // User-initiated change invalidates any in-flight polish.
    polishingIds.delete(id);
    const current = entries[idx];
    const next: Entry = { ...current, ...patch, updatedAt: now() };
    entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
    persist();
  }

  function remove(id: string): void {
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return;
    polishingIds.delete(id);
    entries = next;
    persist();
  }

  function applyPolishResult(
    id: string,
    polishedText: string,
    model: string,
    promptVersion: number,
  ): void {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const current = entries[idx];
    const next: Entry = {
      ...current,
      polishedText,
      polishedAt: now(),
      polishedModel: model,
      polishedPromptVersion: promptVersion,
      updatedAt: now(),
    };
    entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
    persist();
  }

  async function polish(id: string): Promise<void> {
    if (polishingIds.has(id)) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (entry.polishedText != null) return;

    // Client-side length guard: a cheap UX win that avoids the network
    // round-trip for transcripts the server would reject anyway. The
    // server guard remains authoritative.
    if (entry.rawTranscript.length > MAX_POLISH_TRANSCRIPT_CHARS) {
      onPolishError?.("too-long");
      return;
    }

    polishingIds.add(id);
    const { rawTranscript, category } = entry;

    let response: Response;
    try {
      response = await fetchImpl("/api/polish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawTranscript, category }),
      });
    } catch {
      // Network throw — no response, so we can't be more specific than
      // `upstream`. (Timeouts originate server-side in slice #4 and
      // come back as a real 504 body, not a client-side throw.)
      if (polishingIds.delete(id)) onPolishError?.("upstream");
      return;
    }

    // Entry was edited or deleted while the request was in flight:
    // discard the response silently.
    if (!polishingIds.has(id)) return;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (polishingIds.delete(id)) onPolishError?.("upstream");
      return;
    }

    // Re-check: the response parse is async too.
    if (!polishingIds.has(id)) return;

    if (!isObject(payload)) {
      polishingIds.delete(id);
      onPolishError?.("upstream");
      return;
    }

    if (payload.ok === true) {
      const { polishedText, model, promptVersion } = payload as {
        polishedText: unknown;
        model: unknown;
        promptVersion: unknown;
      };
      if (
        typeof polishedText !== "string" ||
        typeof model !== "string" ||
        typeof promptVersion !== "number"
      ) {
        polishingIds.delete(id);
        onPolishError?.("upstream");
        return;
      }
      applyPolishResult(id, polishedText, model, promptVersion);
      polishingIds.delete(id);
      return;
    }

    // `ok: false` branch. Trust the server's `reason` literal when it
    // matches the taxonomy; anything else falls back to `upstream`.
    polishingIds.delete(id);
    const reason = coerceReason(payload.reason);
    const retryAfterMs =
      typeof payload.retryAfterMs === "number" ? payload.retryAfterMs : undefined;
    if (retryAfterMs !== undefined) {
      onPolishError?.(reason, { retryAfterMs });
    } else {
      onPolishError?.(reason);
    }
  }

  function isPolishing(id: string): boolean {
    return polishingIds.has(id);
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
    polish,
    isPolishing,
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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

const KNOWN_REASONS: ReadonlySet<PolishFailureReason> = new Set([
  "too-long",
  "bad-request",
  "rate-limited",
  "quota-exhausted",
  "timeout",
  "upstream",
]);

/** Trust the server's `reason` when it's in the taxonomy; else `upstream`. */
function coerceReason(reason: unknown): PolishFailureReason {
  return typeof reason === "string" && KNOWN_REASONS.has(reason as PolishFailureReason)
    ? (reason as PolishFailureReason)
    : "upstream";
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
