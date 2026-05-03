/**
 * Shared types, zod schemas, and user-facing copy for the polish
 * feature.
 *
 * This module is the single source of truth for the wire contract
 * between `POST /api/polish` and its clients:
 *
 *   - `PolishRequestSchema`  — request body shape.
 *   - `PolishResultSchema`   — response body shape (discriminated
 *                              union on `ok`).
 *   - `PolishResult`         — `z.infer` of the result schema.
 *   - `PolishFailureReason`  — reason literals extracted from the
 *                              schema so taxonomy changes happen in
 *                              exactly one place.
 *   - `POLISH_FAILURE_MESSAGES` — per-reason user-facing toast copy.
 *
 * Importable from both client and server code — it has no runtime
 * dependency on `$lib/server/**`. See ADR-0004 for why we validate
 * wire traffic with zod rather than hand-rolled `typeof` checks.
 */

import { z } from "zod";

/** Maximum `rawTranscript` length accepted by the polish pipeline. */
export const MAX_POLISH_TRANSCRIPT_CHARS = 4000;

/**
 * Categories an Entry can live in. The set is closed in the type
 * system (`$lib/utils/transcript-parser` `Category`); repeated as a
 * zod enum here because request validation is the one place the
 * runtime needs to recognise them as literals.
 */
const CategoryEnum = z.enum(["todo", "note", "idea"]);

/**
 * Wire input for `POST /api/polish`.
 *
 * Note: the `max()` check is a *shape* concern in this schema, but
 * the route still needs to distinguish `bad-request` (empty / wrong
 * type / invalid category) from `too-long` (valid shape, oversized
 * string). The route therefore validates in two stages — see
 * `+server.ts`.
 */
export const PolishRequestSchema = z.object({
  rawTranscript: z.string().min(1).max(MAX_POLISH_TRANSCRIPT_CHARS),
  category: CategoryEnum,
});
export type PolishRequestBody = z.infer<typeof PolishRequestSchema>;

/**
 * Discriminated union describing every response body `POST /api/polish`
 * can emit. The server produces values matching this schema exactly;
 * the client `safeParse`s to recover the typed result (anything else
 * degrades to `upstream`).
 *
 * The `upstream` arm carries a numeric `status` hint (0 when the
 * originator didn't have an HTTP status to quote — e.g. network
 * throw, missing API key). It's never surfaced in UX copy; it exists
 * for logs and server-side tests.
 */
const PolishSuccessSchema = z.object({
  ok: z.literal(true),
  polishedText: z.string(),
  model: z.string(),
  promptVersion: z.number(),
});

/**
 * Inner discriminated union over `reason`. Factored out because zod 4
 * doesn't allow a discriminated union to share the outer discriminator
 * value (`ok: false`) across multiple arms — we discriminate on
 * `reason` at this level and compose with the success arm via a plain
 * `z.union` below.
 */
const PolishFailureSchema = z.discriminatedUnion("reason", [
  z.object({ ok: z.literal(false), reason: z.literal("too-long") }),
  z.object({ ok: z.literal(false), reason: z.literal("bad-request") }),
  z.object({
    ok: z.literal(false),
    reason: z.literal("rate-limited"),
    retryAfterMs: z.number().optional(),
  }),
  z.object({
    ok: z.literal(false),
    reason: z.literal("quota-exhausted"),
    retryAfterMs: z.number().optional(),
  }),
  z.object({ ok: z.literal(false), reason: z.literal("timeout") }),
  z.object({
    ok: z.literal(false),
    reason: z.literal("upstream"),
    status: z.number(),
  }),
]);

export const PolishResultSchema = z.union([
  PolishSuccessSchema,
  PolishFailureSchema,
]);
export type PolishResult = z.infer<typeof PolishResultSchema>;

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
 *
 * Derived from the schema so the taxonomy lives in one place.
 */
export type PolishFailureReason = Extract<
  PolishResult,
  { ok: false }
>["reason"];

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
