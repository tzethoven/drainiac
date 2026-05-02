import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PolishResult } from "$lib/server/polish/gemini";

/**
 * Route test for `POST /api/polish`.
 *
 * We mock the three non-pure dependencies:
 *   - `requireUser` (auth),
 *   - `$env/dynamic/private` (secrets),
 *   - `createGeminiClient` (upstream call).
 *
 * Everything else \u2014 body parsing, validation order, too-long guard,
 * HTTP status + `Retry-After` mapping \u2014 is real code under test.
 */

const requireUser = vi.fn();
vi.mock("$lib/server/auth", () => ({
  requireUser: (event: unknown) => requireUser(event),
}));

vi.mock("$env/dynamic/private", () => ({
  env: { GEMINI_API_KEY: "test-key", GEMINI_MODEL: "test-model" },
}));

const polishMock = vi.fn();
vi.mock("$lib/server/polish/gemini", async () => {
  const types = await vi.importActual<typeof import("$lib/server/polish/gemini")>(
    "$lib/server/polish/gemini",
  );
  return {
    ...types,
    createGeminiClient: () => ({ polish: polishMock }),
  };
});

// Import after mocks are registered.
const { POST } = await import("./+server");

function call(body: unknown): Promise<Response> {
  const request = new Request("http://x/api/polish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  // The real handler receives a `RequestEvent`; only `.request` is used
  // directly in the route after `requireUser(event)`. A minimal stub is
  // enough because `requireUser` is mocked.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Promise.resolve(POST({ request } as any) as Response | Promise<Response>);
}

beforeEach(() => {
  requireUser.mockReset();
  requireUser.mockResolvedValue({ id: "u1" });
  polishMock.mockReset();
});

describe("POST /api/polish — validation", () => {
  it("rejects a non-JSON body with bad-request + 400", async () => {
    const res = await call("{not json");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "bad-request" });
    expect(polishMock).not.toHaveBeenCalled();
  });

  it("rejects a missing rawTranscript with bad-request + 400", async () => {
    const res = await call({ category: "todo" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "bad-request" });
    expect(polishMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid category with bad-request + 400", async () => {
    const res = await call({ rawTranscript: "hi", category: "bogus" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "bad-request" });
    expect(polishMock).not.toHaveBeenCalled();
  });

  it("rejects an empty rawTranscript with bad-request + 400", async () => {
    const res = await call({ rawTranscript: "", category: "todo" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "bad-request" });
    expect(polishMock).not.toHaveBeenCalled();
  });

  it("rejects rawTranscript > 4000 chars with too-long + 400 BEFORE calling Gemini", async () => {
    const res = await call({ rawTranscript: "a".repeat(4001), category: "todo" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "too-long" });
    expect(polishMock).not.toHaveBeenCalled();
  });

  it("accepts rawTranscript at exactly 4000 chars", async () => {
    polishMock.mockResolvedValue({
      ok: true,
      polishedText: "ok",
      model: "m",
      promptVersion: 1,
    } satisfies PolishResult);
    const res = await call({ rawTranscript: "a".repeat(4000), category: "todo" });
    expect(res.status).toBe(200);
    expect(polishMock).toHaveBeenCalledTimes(1);
  });

  it("accepts all three valid categories", async () => {
    polishMock.mockResolvedValue({
      ok: true,
      polishedText: "ok",
      model: "m",
      promptVersion: 1,
    } satisfies PolishResult);
    for (const category of ["todo", "note", "idea"] as const) {
      const res = await call({ rawTranscript: "x", category });
      expect(res.status).toBe(200);
    }
    expect(polishMock).toHaveBeenCalledTimes(3);
  });
});

describe("POST /api/polish — HTTP status mapping", () => {
  const mappings: Array<{ result: PolishResult; status: number }> = [
    {
      result: {
        ok: true,
        polishedText: "Buy milk.",
        model: "m",
        promptVersion: 1,
      },
      status: 200,
    },
    { result: { ok: false, reason: "too-long" }, status: 400 },
    { result: { ok: false, reason: "bad-request" }, status: 400 },
    { result: { ok: false, reason: "rate-limited" }, status: 429 },
    { result: { ok: false, reason: "quota-exhausted" }, status: 429 },
    { result: { ok: false, reason: "timeout" }, status: 504 },
    { result: { ok: false, reason: "upstream", status: 500 }, status: 502 },
  ];

  for (const { result, status } of mappings) {
    it(`maps ${result.ok ? "ok" : result.reason} → ${status}`, async () => {
      polishMock.mockResolvedValue(result);
      const res = await call({ rawTranscript: "x", category: "todo" });
      expect(res.status).toBe(status);
      expect(await res.json()).toEqual(result);
    });
  }

  it("forwards Retry-After on rate-limited", async () => {
    polishMock.mockResolvedValue({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: 2000,
    });
    const res = await call({ rawTranscript: "x", category: "todo" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("2");
  });

  it("forwards Retry-After on quota-exhausted (rounds up sub-seconds)", async () => {
    polishMock.mockResolvedValue({
      ok: false,
      reason: "quota-exhausted",
      retryAfterMs: 1500,
    });
    const res = await call({ rawTranscript: "x", category: "todo" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("2");
  });

  it("omits Retry-After when the upstream did not provide it", async () => {
    polishMock.mockResolvedValue({ ok: false, reason: "rate-limited" });
    const res = await call({ rawTranscript: "x", category: "todo" });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeNull();
  });
});

describe("POST /api/polish — misconfiguration", () => {
  it("missing GEMINI_API_KEY returns upstream (502) without calling Gemini", async () => {
    vi.resetModules();
    vi.doMock("$env/dynamic/private", () => ({ env: {} }));
    vi.doMock("$lib/server/auth", () => ({
      requireUser: async () => ({ id: "u1" }),
    }));
    const localPolishMock = vi.fn();
    vi.doMock("$lib/server/polish/gemini", async () => {
      const types =
        await vi.importActual<typeof import("$lib/server/polish/gemini")>(
          "$lib/server/polish/gemini",
        );
      return {
        ...types,
        createGeminiClient: () => ({ polish: localPolishMock }),
      };
    });
    const { POST: LocalPOST } = await import("./+server");

    const request = new Request("http://x/api/polish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rawTranscript: "x", category: "todo" }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (LocalPOST({ request } as any) as Promise<Response>);

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "upstream", status: 0 });
    expect(localPolishMock).not.toHaveBeenCalled();
  });
});
