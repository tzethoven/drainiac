import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

import { requireUser } from "$lib/server/auth";
import { createGeminiClient } from "$lib/server/polish/gemini";
import type { Category } from "$lib/utils/transcript-parser";

const MAX_TRANSCRIPT_CHARS = 4000;
const VALID_CATEGORIES: ReadonlySet<Category> = new Set(["todo", "note", "idea"]);

/**
 * POST /api/polish — returns a polished form of `rawTranscript` for the
 * given `category`. Narrow-union response in slice #2:
 *   - `{ ok: true; polishedText; model; promptVersion }`
 *   - `{ ok: false; reason: "upstream" | "bad-request" }`
 */
export const POST: RequestHandler = async (event) => {
  await requireUser(event);

  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    return json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const rawTranscript =
    body && typeof body === "object" && "rawTranscript" in body
      ? (body as { rawTranscript: unknown }).rawTranscript
      : undefined;
  const category =
    body && typeof body === "object" && "category" in body
      ? (body as { category: unknown }).category
      : undefined;

  if (
    typeof rawTranscript !== "string" ||
    rawTranscript.length === 0 ||
    rawTranscript.length > MAX_TRANSCRIPT_CHARS ||
    typeof category !== "string" ||
    !VALID_CATEGORIES.has(category as Category)
  ) {
    return json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const apiKey = env.GEMINI_API_KEY;
  const model = env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";
  if (!apiKey) {
    // Misconfiguration — surface as upstream to the client (the richer
    // taxonomy lands in slice #4).
    return json({ ok: false, reason: "upstream" });
  }

  const client = createGeminiClient({ apiKey, model });
  const result = await client.polish({
    rawTranscript,
    category: category as Category,
  });

  return json(result);
};
