/**
 * Text-normalization helpers for user-edited entry text.
 *
 * Distinct from `transcript-parser.cleanBody`, which also capitalizes and
 * appends punctuation — those transformations belong to the voice-capture
 * path only. Edits are literal: what the user typed is what gets stored.
 */

/** Trim and collapse internal whitespace. Safe for any user-entered text. */
export function normalizeEditText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** True when the text is empty or whitespace-only after normalization. */
export function isBlank(input: string): boolean {
  return normalizeEditText(input).length === 0;
}
