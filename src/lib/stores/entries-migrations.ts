import type { Entry } from "./entries-store.svelte";

/**
 * Current Entry schema version. Bump together with a migration step.
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;

/**
 * Pure migration from any historical Entry shape to the current
 * Entry shape. Dispatches on `schemaVersion`.
 *
 * Returns `null` for inputs that are not recognisable as any version
 * of an Entry (missing id, unknown schemaVersion, completely malformed).
 * Callers are expected to filter nulls out of the loaded array. This
 * is intentionally lenient: a single corrupt entry in localStorage
 * should not take the whole inbox down.
 *
 * Designed to grow: add a `migrateVnToVn+1` helper and a new case in
 * the dispatch when the schema changes again.
 */
export function migrate(raw: unknown): Entry | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.id !== "string") return null;
  const version = obj.schemaVersion;

  if (version === 2) {
    // Already current — trust the shape. Callers that persist after
    // migration will re-normalize on next write anyway.
    return obj as unknown as Entry;
  }
  if (version === 1) {
    return migrateV1ToV2(obj as unknown as EntryV1);
  }
  return null;
}

/**
 * Apply `migrate` to every element of an array, dropping nulls.
 * Second return value reports whether any entry's shape actually
 * changed — callers use this to decide whether to eagerly persist.
 */
export function migrateAll(raws: unknown[]): {
  entries: Entry[];
  changed: boolean;
} {
  const entries: Entry[] = [];
  let changed = false;
  for (const raw of raws) {
    const migrated = migrate(raw);
    if (!migrated) {
      changed = true; // dropping a corrupt entry counts as a change worth persisting
      continue;
    }
    if (
      !raw ||
      typeof raw !== "object" ||
      (raw as { schemaVersion?: unknown }).schemaVersion !==
        CURRENT_SCHEMA_VERSION
    ) {
      changed = true;
    }
    entries.push(migrated);
  }
  return { entries, changed };
}

// --- Internal: v1 shape and upgrader ---------------------------------

interface EntryV1 {
  id: string;
  schemaVersion: 1;
  category: Entry["category"];
  displayText: string;
  rawTranscript: string;
  source: Entry["source"];
  done: boolean;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  warning?: Entry["warning"];
}

function migrateV1ToV2(v1: EntryV1): Entry {
  return {
    ...v1,
    schemaVersion: 2,
    polishedText: null,
    polishedAt: null,
    polishedModel: null,
    polishedPromptVersion: null,
  };
}
