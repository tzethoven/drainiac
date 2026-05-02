/**
 * Thin Gemini REST client for the polish feature.
 *
 * Deliberately uses raw `fetch` against the `v1beta` endpoint rather
 * than the `@google/genai` SDK so the code runs unchanged on
 * Cloudflare Workers (no Node-only imports) and so test mocking is a
 * one-liner `vi.stubGlobal("fetch", …)`.
 *
 * In this slice (#2) the result type is a narrow union:
 *
 *   - `{ ok: true; polishedText; model; promptVersion }`
 *   - `{ ok: false; reason: "upstream" }`
 *
 * A 15-second `AbortController` timeout also maps to
 * `{ ok: false; reason: "upstream" }`. The richer error taxonomy
 * (rate-limit / quota / too-long / timeout) lands in slice #4.
 */

import type { Category } from "$lib/utils/transcript-parser";
import { buildPolishPrompt, PROMPT_VERSION } from "./prompt";

export type PolishResult =
  | { ok: true; polishedText: string; model: string; promptVersion: number }
  | { ok: false; reason: "upstream" };

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
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      // Network failure or timeout abort.
      return { ok: false, reason: "upstream" };
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return { ok: false, reason: "upstream" };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return { ok: false, reason: "upstream" };
    }

    const text = extractText(payload);
    if (text === null) return { ok: false, reason: "upstream" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, reason: "upstream" };
    }

    const polishedText =
      parsed && typeof parsed === "object" && "polished" in parsed
        ? (parsed as { polished: unknown }).polished
        : null;

    if (typeof polishedText !== "string" || polishedText.length === 0) {
      return { ok: false, reason: "upstream" };
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
