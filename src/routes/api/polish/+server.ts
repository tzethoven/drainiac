import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { z } from "zod";

import { requireUser } from "$lib/server/auth";
import { createGeminiClient } from "$lib/server/polish/gemini";
import {
  MAX_POLISH_TRANSCRIPT_CHARS,
  type PolishResult,
} from "$lib/polish/types";

export const prerender = false;

/**
 * Shape-only pass: is this a well-formed polish request ignoring the
 * length cap? A failure here is a `bad-request`. The length cap is
 * checked as a second stage so an oversized-but-otherwise-valid body
 * can be distinguished as `too-long`.
 *
 * We don't reuse `PolishRequestSchema` here because that schema bakes
 * the length cap into the shape — which is correct for the type but
 * conflates the two failure branches the wire contract separates.
 */
const RequestShapeSchema = z.object({
  rawTranscript: z.string().min(1),
  category: z.enum(["todo", "note", "idea"]),
});

/**
 * POST /api/polish — returns a polished form of `rawTranscript` for the
 * given `category`.
 *
 * Response contract (see `$lib/polish/types` `PolishResultSchema`):
 *
 *   - `{ ok: true;  polishedText; model; promptVersion }`           200
 *   - `{ ok: false; reason: "too-long" }`                           400
 *   - `{ ok: false; reason: "bad-request" }`                        400
 *   - `{ ok: false; reason: "rate-limited";    retryAfterMs? }`     429
 *   - `{ ok: false; reason: "quota-exhausted"; retryAfterMs? }`     429
 *   - `{ ok: false; reason: "timeout" }`                            504
 *   - `{ ok: false; reason: "upstream"; status }`                   502
 *
 * `Retry-After` from Gemini is forwarded verbatim on 429 responses
 * when present. The body shape always matches the union — the HTTP
 * status is a redundant hint, not the source of truth.
 */
export const POST: RequestHandler = async (event) => {
  await requireUser(event);

  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return respond({ ok: false, reason: "bad-request" });
  }

  // Stage 1: shape + category. A malformed body is a `bad-request`,
  // even if the `rawTranscript` field happens to be an oversized
  // string.
  const shape = RequestShapeSchema.safeParse(body);
  if (!shape.success) {
    return respond({ ok: false, reason: "bad-request" });
  }
  const { rawTranscript, category } = shape.data;

  // Stage 2: length guard. Runs *before* Gemini so oversized
  // transcripts fail fast and cheaply. The client runs the same check
  // pre-flight; this server check is the authoritative one.
  if (rawTranscript.length > MAX_POLISH_TRANSCRIPT_CHARS) {
    return respond({ ok: false, reason: "too-long" });
  }

  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";
  if (!apiKey) {
    // Misconfiguration is an upstream problem from the client's
    // perspective — same generic toast, no special-casing.
    return respond({ ok: false, reason: "upstream", status: 0 });
  }

  const client = createGeminiClient({ apiKey, model });
  const result = await client.polish({ rawTranscript, category });

  return respond(result);
};

/**
 * Render a `PolishResult` as an HTTP response with the status and
 * headers mandated by the slice-#4 contract.
 */
function respond(result: PolishResult): Response {
  if (result.ok) return json(result);

  switch (result.reason) {
    case "too-long":
    case "bad-request":
      return json(result, { status: 400 });
    case "rate-limited":
    case "quota-exhausted": {
      const headers: Record<string, string> = {};
      if (result.retryAfterMs !== undefined) {
        // Forward as seconds per RFC 7231; round up so a sub-second
        // hint doesn't become `0` (= "retry immediately").
        headers["retry-after"] = String(Math.ceil(result.retryAfterMs / 1000));
      }
      return json(result, { status: 429, headers });
    }
    case "timeout":
      return json(result, { status: 504 });
    case "upstream":
      return json(result, { status: 502 });
  }
}
