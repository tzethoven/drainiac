import type { Category } from "$lib/utils/transcript-parser";
import { getContext, setContext } from "svelte";
import { CURRENT_SCHEMA_VERSION, migrateAll } from "./entries-migrations";
import {
  MAX_POLISH_TRANSCRIPT_CHARS,
  type PolishFailureReason,
} from "$lib/polish/types";
import {
  createHttpPolishClient,
  type PolishClient,
} from "$lib/polish/polish-client";
import { effectiveText } from "$lib/utils/effective-text";
import { isBlank, normalizeEditText } from "$lib/utils/edit-text";

/**
 * Grouped polish metadata. All four fields move as one — CONTEXT.md
 * invariant "set together, cleared together" is now structural:
 * either `entry.polish` is `null` (unpolished or reverted) or every
 * field is populated. No partial states are representable.
 */
export interface Polish {
  /** AI-polished form of the entry's body. */
  text: string;
  /** Timestamp of the polish. */
  at: number;
  /** Gemini model id used, e.g. `gemini-3.1-flash-lite-preview`. */
  model: string;
  /** Prompt template version used. */
  promptVersion: number;
}

export interface Entry {
  id: string;
  schemaVersion: 3;
  category: Category;
  displayText: string;
  rawTranscript: string;
  source: "voice" | "text";
  done: boolean;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  warning?: "partial-transcription";
  /**
   * Grouped polish metadata. `null` when the entry has not been
   * polished or has been reverted. See `Polish`.
   */
  polish: Polish | null;
}

/**
 * Internal reducer patch shape. Not exported: callers use the
 * intent-named operations (`editText`, `setCategory`, `toggleDone`,
 * `revertPolish`) which structurally enforce the polish invariants.
 * `updatedAt` is always stamped by the store itself.
 */
type EntryUpdatePatch = Partial<
  Pick<Entry, "displayText" | "category" | "done"> & {
    polish: Polish | null;
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
  /**
   * HTTP client for `/api/polish`. Tests inject a `FakePolishClient`
   * returning typed `PolishResult` values; production uses the
   * default `createHttpPolishClient()` against global `fetch`.
   */
  polishClient?: PolishClient;
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
  /**
   * Commit a user edit of the entry body. Encapsulates the three
   * save-path cases:
   *   1. Input (after whitespace-normalise) equals `effectiveText` →
   *      no write, no `updatedAt` bump.
   *   2. Input differs and the entry is polished → write the new
   *      `displayText` and clear `polish` in one shot (the edit
   *      becomes the canonical display).
   *   3. Input differs and the entry is unpolished → write
   *      `displayText` only.
   * Blank input is a no-op (defence in depth; the EditSheet also
   * disables Save while blank).
   */
  editText(id: string, displayText: string): void;
  /** Change the entry's category. Does not touch polish metadata. */
  setCategory(id: string, category: Category): void;
  /** Flip `done`. Does not touch polish metadata. */
  toggleDone(id: string): void;
  /**
   * Clear polish metadata while leaving `displayText` and
   * `rawTranscript` untouched, so a re-polish remains available.
   */
  revertPolish(id: string): void;
  remove(id: string): void;
  restore(entry: Entry): void;
  clearDone(): void;
  /**
   * Trigger an AI polish for the given entry. No-op if the entry is
   * already polishing or already has `polish` set. On success the
   * grouped `polish` field is applied; on failure `onPolishError` is
   * called and the entry is left unchanged. If any user-initiated
   * mutation (`editText` that writes, `setCategory`, `toggleDone`,
   * `revertPolish`, `remove`) happens while the request is in flight,
   * the eventual response is discarded silently.
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

  const polishClient = options.polishClient ?? createHttpPolishClient();
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
      polish: null,
      ...(input.warning ? { warning: input.warning } : {}),
    };
    entries = [entry, ...entries];
    persist();
    return entry;
  }

  /**
   * Internal reducer. Every user-initiated mutation funnels through
   * here so the `polishingIds.delete(id)` + `updatedAt` stamp + write
   * are guaranteed to move together. Callers are the intent-named
   * operations below; external callers use those, not this.
   */
  function applyPatch(id: string, patch: EntryUpdatePatch): void {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    // User-initiated change invalidates any in-flight polish.
    polishingIds.delete(id);
    const current = entries[idx];
    const next: Entry = { ...current, ...patch, updatedAt: now() };
    entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
    persist();
  }

  function editText(id: string, displayText: string): void {
    if (isBlank(displayText)) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const normalized = normalizeEditText(displayText);
    // Case 1: no-op when the normalised input matches what the user
    // already sees. Must not bump `updatedAt` or clear polish.
    if (normalized === effectiveText(entry)) return;
    // Case 2: diverging edit on a polished entry — clear the quartet
    // and let the edit become canonical. Case 3: plain write.
    const patch: EntryUpdatePatch =
      entry.polish != null
        ? { displayText: normalized, polish: null }
        : { displayText: normalized };
    applyPatch(id, patch);
  }

  function setCategory(id: string, category: Category): void {
    applyPatch(id, { category });
  }

  function toggleDone(id: string): void {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    applyPatch(id, { done: !entry.done });
  }

  function revertPolish(id: string): void {
    applyPatch(id, { polish: null });
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
    const ts = now();
    const next: Entry = {
      ...current,
      polish: { text: polishedText, at: ts, model, promptVersion },
      updatedAt: ts,
    };
    entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
    persist();
  }

  async function polish(id: string): Promise<void> {
    if (polishingIds.has(id)) return;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    if (entry.polish != null) return;

    // Client-side length guard: a cheap UX win that avoids the network
    // round-trip for transcripts the server would reject anyway. The
    // server guard remains authoritative.
    if (entry.rawTranscript.length > MAX_POLISH_TRANSCRIPT_CHARS) {
      onPolishError?.("too-long");
      return;
    }

    polishingIds.add(id);
    const result = await polishClient.polish({
      rawTranscript: entry.rawTranscript,
      category: entry.category,
    });

    // Entry was edited or deleted while the request was in flight:
    // discard the response silently. `update` / `remove` both
    // `polishingIds.delete(id)` unconditionally, so membership here
    // means "still the same in-flight request we started above".
    if (!polishingIds.delete(id)) return;

    if (result.ok) {
      applyPolishResult(id, result.polishedText, result.model, result.promptVersion);
      return;
    }

    if (
      (result.reason === "rate-limited" || result.reason === "quota-exhausted") &&
      result.retryAfterMs !== undefined
    ) {
      onPolishError?.(result.reason, { retryAfterMs: result.retryAfterMs });
    } else {
      onPolishError?.(result.reason);
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
    editText,
    setCategory,
    toggleDone,
    revertPolish,
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
