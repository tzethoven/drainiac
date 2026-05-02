import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

import { requireUser } from "$lib/server/auth";
import { createGeminiClient, type PolishResult } from "$lib/server/polish/gemini";
import { MAX_POLISH_TRANSCRIPT_CHARS } from "$lib/polish/types";
import type { Category } from "$lib/utils/transcript-parser";

const VALID_CATEGORIES: ReadonlySet<Category> = new Set(["todo", "note", "idea"]);

/**
 * POST /api/polish — returns a polished form of `rawTranscript` for the
 * given `category`.
 *
 * Response contract (see `$lib/server/polish/gemini.ts` `PolishResult`):
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

  const rawTranscript =
    body && typeof body === "object" && "rawTranscript" in body
      ? (body as { rawTranscript: unknown }).rawTranscript
      : undefined;
  const category =
    body && typeof body === "object" && "category" in body
      ? (body as { category: unknown }).category
      : undefined;

  // Shape + category validation first — a malformed body is a
  // `bad-request`, not a `too-long`, even if the `rawTranscript` field
  // happens to be an oversized string.
  if (
    typeof rawTranscript !== "string" ||
    rawTranscript.length === 0 ||
    typeof category !== "string" ||
    !VALID_CATEGORIES.has(category as Category)
  ) {
    return respond({ ok: false, reason: "bad-request" });
  }

  // Length guard runs *before* Gemini so oversized transcripts fail
  // fast and cheaply. The client runs the same check pre-flight; this
  // server check is the authoritative one.
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
  const result = await client.polish({
    rawTranscript,
    category: category as Category,
  });

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
