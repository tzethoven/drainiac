/**
 * Pure helper encapsulating `EditSheet`'s three-case save logic.
 *
 * See `.agents/issues/003-edit-and-revert-semantics.md`.
 *
 * Cases:
 *   1. Normalized input equals `effectiveText(entry)` → return `null`.
 *      The sheet must not bump `updatedAt` or clear polish metadata
 *      when the user opened it only to re-read.
 *   2. Input differs and `entry.polishedText != null` → return a patch
 *      that writes the new `displayText` and clears all four polish
 *      metadata fields. The edit becomes the canonical display.
 *   3. Input differs and `entry.polishedText == null` → return a patch
 *      with just `displayText` (pre-polish behaviour).
 *
 * Blank inputs are callers' responsibility (EditSheet disables Save
 * while blank); we still return `null` for blank-after-normalize so
 * the helper can't accidentally wipe an entry.
 *
 * Note: this helper normalizes whitespace via `normalizeEditText` so
 * the equality check is semantic ("same visible text") rather than
 * strict ("same bytes"). The normalized form is what we persist.
 */
import type { Entry } from "$lib/stores/entries-store.svelte";
import { normalizeEditText, isBlank } from "./edit-text";
import { effectiveText } from "./effective-text";

/** Fields that may be written by a save-path patch. */
export type EditSavePatch =
  | { displayText: string }
  | {
      displayText: string;
      polishedText: null;
      polishedAt: null;
      polishedModel: null;
      polishedPromptVersion: null;
    };

export function computeEditSave(
  newText: string,
  entry: Entry,
): EditSavePatch | null {
  if (isBlank(newText)) return null;
  const normalized = normalizeEditText(newText);
  if (normalized === effectiveText(entry)) return null;

  if (entry.polishedText != null) {
    return {
      displayText: normalized,
      polishedText: null,
      polishedAt: null,
      polishedModel: null,
      polishedPromptVersion: null,
    };
  }
  return { displayText: normalized };
}

/** Patch that clears the four polish metadata fields in one shot. */
export const REVERT_POLISH_PATCH = {
  polishedText: null,
  polishedAt: null,
  polishedModel: null,
  polishedPromptVersion: null,
} as const;
