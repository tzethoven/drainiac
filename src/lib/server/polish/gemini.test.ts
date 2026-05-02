import { describe, it, expect, vi } from "vitest";
import { createGeminiClient } from "./gemini";
import { PROMPT_VERSION } from "./prompt";

function geminiResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text }] } },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

describe("createGeminiClient", () => {
  it("happy path: posts to the configured model and returns polishedText", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toContain("/models/test-model:generateContent");
      expect(String(url)).toContain("key=secret-key");
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(body.systemInstruction.parts[0].text).toMatch(/TODO/);
      expect(body.contents[0].parts[0].text).toBe("buy milk");
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      return geminiResponse(JSON.stringify({ polished: "Buy milk." }));
    });

    const client = createGeminiClient({
      apiKey: "secret-key",
      model: "test-model",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.polish({ rawTranscript: "buy milk", category: "todo" });

    expect(result).toEqual({
      ok: true,
      polishedText: "Buy milk.",
      model: "test-model",
      promptVersion: PROMPT_VERSION,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns upstream error when HTTP status is non-2xx", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
    const client = createGeminiClient({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.polish({ rawTranscript: "x", category: "note" });
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("returns upstream error when response body is not valid JSON candidate text", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
    );
    const client = createGeminiClient({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.polish({ rawTranscript: "x", category: "note" });
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("returns upstream error when candidate text is not valid JSON", async () => {
    const fetchImpl = vi.fn(async () => geminiResponse("not json"));
    const client = createGeminiClient({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.polish({ rawTranscript: "x", category: "note" });
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("returns upstream error when fetch rejects (network failure)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createGeminiClient({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await client.polish({ rawTranscript: "x", category: "idea" });
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });

  it("returns upstream error when the request is aborted by the timeout", async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    const client = createGeminiClient({
      apiKey: "k",
      model: "m",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 5,
    });
    const result = await client.polish({ rawTranscript: "x", category: "todo" });
    expect(result).toEqual({ ok: false, reason: "upstream" });
  });
});
