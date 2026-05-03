/**
 * Thin Gemini REST client for the polish feature.
 *
 * Deliberately uses raw `fetch` against the `v1beta` endpoint rather
 * than the `@google/genai` SDK so the code runs unchanged on
 * Cloudflare Workers (no Node-only imports) and so test mocking is a
 * one-liner `vi.stubGlobal("fetch", …)`.
 *
 * Slice #4 expanded the failure taxonomy — see `./types.ts` for the
 * reason literals and `.agents/issues/004-full-error-taxonomy-ux-polish.md`
 * for the rationale. Classification rules here:
 *
 *   - 429 with a `PerDay` hint in `quotaId` / `quotaMetric` →
 *     `quota-exhausted`.
 *   - 429 with a `PerMinute` hint, or 429 with no hint at all →
 *     `rate-limited`. (Unclassifiable 429s default to the less-scary
 *     rate-limit branch.)
 *   - The 15-second `AbortController` firing → `timeout`.
 *   - Any other non-2xx (incl. 5xx) or network throw or malformed
 *     response body → `upstream`.
 *
 * No retries. One attempt per call. Automatic retries were explicitly
 * rejected during spec grilling — a second request that races a user
 * edit would make the `polishingIds` conflict model harder to reason
 * about, and the user can simply long-press again.
 */

import type { Category } from "$lib/utils/transcript-parser";
import type { PolishFailureReason, PolishResult } from "$lib/polish/types";
import { buildPolishPrompt, PROMPT_VERSION } from "./prompt";

// `PolishResult` is the shared wire contract — see `$lib/polish/types`.
// Re-exported here so existing callers (server route, server tests)
// keep working; new code should import from `$lib/polish/types`.
export type { PolishResult };

export interface GeminiClientOptions {
  apiKey: string;
  model: string;
  /** Override for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Override for tests. Defaults to 15 s. */
  timeoutMs?: number;
}

export interface PolishInput {
  rawTranscript: string;
  category: Category;
}

export interface GeminiClient {
  polish(input: PolishInput): Promise<PolishResult>;
}

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

export function createGeminiClient(options: GeminiClientOptions): GeminiClient {
  const { apiKey, model } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;

  async function polish(input: PolishInput): Promise<PolishResult> {
    const { system, user, config } = buildPolishPrompt(
      input.category,
      input.rawTranscript,
    );

    const body = {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        responseMimeType: config.responseMimeType,
        responseSchema: config.responseSchema,
      },
    };

    const url = `${GEMINI_ENDPOINT}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      // The abort fired *our* timeout — surface it distinctly so the
      // client can show the timeout-specific toast. Everything else
      // (DNS error, TCP reset, TLS failure, …) is `upstream` with
      // status 0 as a sentinel.
      return timedOut
        ? { ok: false, reason: "timeout" }
        : { ok: false, reason: "upstream", status: 0 };
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return classifyHttpError(response);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, reason: "upstream", status: response.status };
    }

    const text = extractText(payload);
    if (text === null) {
      return { ok: false, reason: "upstream", status: response.status };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: "upstream", status: response.status };
    }

    const polishedText =
      parsed && typeof parsed === "object" && "polished" in parsed
        ? (parsed as { polished: unknown }).polished
        : null;

    if (typeof polishedText !== "string" || polishedText.length === 0) {
      return { ok: false, reason: "upstream", status: response.status };
    }

    return {
      ok: true,
      polishedText,
      model,
      promptVersion: PROMPT_VERSION,
    };
  }

  return { polish };
}

/**
 * Turn a non-2xx `Response` into the matching failure branch.
 *
 * For 429 we peek at the JSON error body for Google's `quotaId` /
 * `quotaMetric` strings. Substrings like `PerDay` / `PerDayPerProject`
 * mean the daily budget is exhausted; `PerMinute` means we should back
 * off briefly. We also forward `Retry-After` (in seconds) as
 * `retryAfterMs` so future UI can use it — this slice doesn't render
 * a countdown.
 */
async function classifyHttpError(response: Response): Promise<
  Extract<PolishResult, { ok: false }>
> {
  if (response.status !== 429) {
    return { ok: false, reason: "upstream", status: response.status };
  }

  const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));

  // Read the body defensively — we can't assume Google sent JSON.
  let bodyText = "";
  try {
    bodyText = await response.text();
  } catch {
    // If we can't read the body we can't classify — default to
    // rate-limited per spec.
    return reason429("rate-limited", retryAfterMs);
  }

  const reason: PolishFailureReason = classify429Body(bodyText);
  return reason === "quota-exhausted"
    ? reason429("quota-exhausted", retryAfterMs)
    : reason429("rate-limited", retryAfterMs);
}

function reason429(
  kind: "rate-limited" | "quota-exhausted",
  retryAfterMs: number | undefined,
): Extract<PolishResult, { ok: false }> {
  return retryAfterMs === undefined
    ? { ok: false, reason: kind }
    : { ok: false, reason: kind, retryAfterMs };
}

/**
 * Substring match on a 429 body. We don't fully parse Google's nested
 * `{ error: { details: [...] } }` shape — a string search for the
 * quota hint is robust to shape changes and cheap to maintain.
 */
function classify429Body(body: string): PolishFailureReason {
  if (body.length === 0) return "rate-limited";
  // PerDay comes first: a body that mentions both (unlikely) should
  // prefer the worse user-facing message.
  if (/PerDay/i.test(body)) return "quota-exhausted";
  if (/PerMinute/i.test(body)) return "rate-limited";
  return "rate-limited";
}

/**
 * `Retry-After` per RFC 7231: either an integer number of seconds or
 * an HTTP-date. Gemini uses the seconds form; we only handle that and
 * ignore anything else (returning `undefined` leaves the field off the
 * response).
 */
function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header.trim());
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.round(seconds * 1000);
}

/**
 * Extracts the raw text string from a Gemini `generateContent` response.
 *
 * Shape: `{ candidates: [ { content: { parts: [ { text: "..." } ] } } ] }`
 * Returns `null` if any expected field is missing.
 */
function extractText(payload: unknown): string | null {
  const candidates =
    payload && typeof payload === "object" && "candidates" in payload
      ? (payload as { candidates: unknown }).candidates
      : null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const first = candidates[0];
  const content =
    first && typeof first === "object" && "content" in first
      ? (first as { content: unknown }).content
      : null;
  const parts =
    content && typeof content === "object" && "parts" in content
      ? (content as { parts: unknown }).parts
      : null;
  if (!Array.isArray(parts) || parts.length === 0) return null;

  const firstPart = parts[0];
  const text =
    firstPart && typeof firstPart === "object" && "text" in firstPart
      ? (firstPart as { text: unknown }).text
      : null;
  return typeof text === "string" ? text : null;
}
