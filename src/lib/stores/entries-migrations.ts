import type { Entry, Polish } from "./entries-store.svelte";

/**
 * Current Entry schema version. Bump together with a migration step.
 */
export const CURRENT_SCHEMA_VERSION = 3 as const;

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

  if (version === 3) {
    // Already current — trust the shape.
    return obj as unknown as Entry;
  }
  if (version === 2) {
    return migrateV2ToV3(obj as unknown as EntryV2);
  }
  if (version === 1) {
    return migrateV2ToV3(migrateV1ToV2(obj as unknown as EntryV1));
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

interface EntryV2 {
  id: string;
  schemaVersion: 2;
  category: Entry["category"];
  displayText: string;
  rawTranscript: string;
  source: Entry["source"];
  done: boolean;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  warning?: Entry["warning"];
  polishedText: string | null;
  polishedAt: number | null;
  polishedModel: string | null;
  polishedPromptVersion: number | null;
}

function migrateV1ToV2(v1: EntryV1): EntryV2 {
  return {
    ...v1,
    schemaVersion: 2,
    polishedText: null,
    polishedAt: null,
    polishedModel: null,
    polishedPromptVersion: null,
  };
}

/**
 * Collapse the v2 polish quartet into the grouped `polish` field.
 *
 * The CONTEXT.md invariant says the quartet moves as one, so v2 data
 * should never contain partial states in practice. We still defend
 * against it: if any of the four fields is missing, we treat the
 * entry as unpolished (`polish: null`). Only when all four are
 * present and well-typed do we emit a populated `Polish` value.
 */
function migrateV2ToV3(v2: EntryV2): Entry {
  const {
    polishedText,
    polishedAt,
    polishedModel,
    polishedPromptVersion,
    ...rest
  } = v2;

  const polish: Polish | null =
    typeof polishedText === "string" &&
    typeof polishedAt === "number" &&
    typeof polishedModel === "string" &&
    typeof polishedPromptVersion === "number"
      ? {
          text: polishedText,
          at: polishedAt,
          model: polishedModel,
          promptVersion: polishedPromptVersion,
        }
      : null;

  return {
    ...rest,
    schemaVersion: 3,
    polish,
  };
}
