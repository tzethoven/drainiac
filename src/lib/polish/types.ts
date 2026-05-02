/**
 * Shared types and user-facing copy for the polish feature.
 *
 * Slice #4 expands the failure taxonomy beyond the slice-#2 "upstream"
 * catch-all. The reason literals are part of the HTTP contract between
 * `/api/polish` and `entriesStore.polish` — both sides must import from
 * here rather than re-declare the union.
 *
 * See `.agents/issues/004-full-error-taxonomy-ux-polish.md`.
 */

/**
 * Discriminants for why a polish attempt failed. Strings are the wire
 * format for `{ ok: false; reason }` response bodies.
 *
 *  - `too-long`         Transcript exceeded the length guard (4000 chars).
 *                       Rejected client-side pre-flight and server-side
 *                       before the Gemini call.
 *  - `bad-request`      Malformed body (missing / empty / wrong-type
 *                       `rawTranscript`, invalid `category`). Server-only.
 *  - `rate-limited`     Per-minute Gemini rate limit, or an unclassified
 *                       429. May carry `retryAfterMs`.
 *  - `quota-exhausted`  Per-day Gemini quota — the polish budget is gone
 *                       until tomorrow.
 *  - `timeout`          The 15-second client abort fired before Gemini
 *                       responded.
 *  - `upstream`         Any other upstream misbehaviour: non-2xx that
 *                       isn't a 429 classified above, network throw,
 *                       malformed response body, missing API key, etc.
 */
export type PolishFailureReason =
  | "too-long"
  | "bad-request"
  | "rate-limited"
  | "quota-exhausted"
  | "timeout"
  | "upstream";

/**
 * Per-reason toast copy. Defined in exactly one place so the product
 * voice is greppable and easy to tune. The `bad-request` branch reuses
 * the `too-long` copy because the only realistic way a user triggers
 * it in practice is by emitting a transcript the length guard already
 * rejected — we don't want to surface "Malformed request" to a user.
 */
export const POLISH_FAILURE_MESSAGES: Record<PolishFailureReason, string> = {
  "rate-limited": "Too fast — try again in a sec.",
  "quota-exhausted": "Polish quota used up for today.",
  timeout: "Polish timed out. Try again?",
  "too-long": "Too long to polish.",
  "bad-request": "Too long to polish.",
  upstream: "Couldn't polish — try again.",
};

/** Maximum `rawTranscript` length accepted by the polish pipeline. */
export const MAX_POLISH_TRANSCRIPT_CHARS = 4000;
