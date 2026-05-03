import type { Entry } from "../stores/entries-store.svelte";

/**
 * Effective user-facing text for an Entry.
 *
 * Precedence: `polish.text` (AI-polished form) when present, else
 * `displayText` (cleanBody output or the user's last manual edit).
 * `rawTranscript` is never returned here — it's the audit trail, not
 * something we render.
 *
 * This is the single read site for "what string do we show the user?"
 * and must be used by every user-facing surface: inbox row rendering,
 * edit sheet seed value, copy/share paths, search.
 *
 * See `.agents/issues/001-foundation-rewire-schema-v2-edit-sheet-category.md`,
 * `.agents/issues/005-group-polish-metadata-into-single-field.md`,
 * and CONTEXT.md.
 */
export function effectiveText(entry: Entry): string {
  return entry.polish?.text ?? entry.displayText;
}
