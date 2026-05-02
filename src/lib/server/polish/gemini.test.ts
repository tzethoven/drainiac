import { describe, it, expect, vi } from "vitest";
import { createGeminiClient } from "./gemini";
import { PROMPT_VERSION } from "./prompt";

function geminiResponse(text: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function errorResponse(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status, headers: { "content-type": "application/json", ...headers } },
  );
}

function clientWith(fetchImpl: unknown, timeoutMs = 15_000) {
  return createGeminiClient({
    apiKey: "k",
    model: "m",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    timeoutMs,
  });
}

describe("createGeminiClient", () => {
  describe("happy path", () => {
    it("posts to the configured model and returns polishedText", async () => {
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
  });

  describe("429 classification", () => {
    it("classifies PerMinute quota hint as rate-limited", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(429, {
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                violations: [
                  {
                    quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                    quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
                  },
                ],
              },
            ],
          },
        }),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "rate-limited" });
    });

    it("classifies PerDay quota hint as quota-exhausted", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(429, {
          error: {
            code: 429,
            status: "RESOURCE_EXHAUSTED",
            details: [
              {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                violations: [
                  {
                    quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                    quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                  },
                ],
              },
            ],
          },
        }),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "quota-exhausted" });
    });

    it("defaults to rate-limited when the 429 body has no quota hint", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(429, { error: { code: 429, message: "Too many requests" } }),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "rate-limited" });
    });

    it("forwards Retry-After (seconds) as retryAfterMs", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(
          429,
          { error: { code: 429, message: "rate" } },
          { "retry-after": "2" },
        ),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "rate-limited", retryAfterMs: 2000 });
    });

    it("forwards Retry-After on quota-exhausted too", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(
          429,
          { error: { details: [{ quotaId: "PerDayFoo" }] } },
          { "retry-after": "60" },
        ),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({
        ok: false,
        reason: "quota-exhausted",
        retryAfterMs: 60_000,
      });
    });

    it("ignores non-numeric Retry-After (HTTP-date form)", async () => {
      const fetchImpl = vi.fn(async () =>
        errorResponse(
          429,
          { error: { code: 429 } },
          { "retry-after": "Wed, 21 Oct 2026 07:28:00 GMT" },
        ),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "rate-limited" });
    });
  });

  describe("other failure branches", () => {
    it("non-2xx / 5xx maps to upstream with status", async () => {
      const fetchImpl = vi.fn(async () => new Response("nope", { status: 500 }));
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "note" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 500 });
    });

    it("400 (not 429) maps to upstream with status", async () => {
      const fetchImpl = vi.fn(async () => new Response("bad", { status: 400 }));
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "note" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 400 });
    });

    it("network throw maps to upstream with status 0", async () => {
      const fetchImpl = vi.fn(async () => {
        throw new Error("network down");
      });
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "idea" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 0 });
    });

    it("malformed JSON body maps to upstream", async () => {
      const fetchImpl = vi.fn(
        async () =>
          new Response("{not json", {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "note" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
    });

    it("missing candidates in response maps to upstream", async () => {
      const fetchImpl = vi.fn(
        async () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }),
      );
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "note" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
    });

    it("candidate text that isn't valid JSON maps to upstream", async () => {
      const fetchImpl = vi.fn(async () => geminiResponse("not json"));
      const result = await clientWith(fetchImpl).polish({ rawTranscript: "x", category: "note" });
      expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
    });

    it("aborted-by-timeout maps to timeout (distinct from upstream)", async () => {
      const fetchImpl = vi.fn(
        (_url: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      );
      const result = await clientWith(fetchImpl, 5).polish({ rawTranscript: "x", category: "todo" });
      expect(result).toEqual({ ok: false, reason: "timeout" });
    });
  });
});
