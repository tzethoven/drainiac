import { describe, it, expect, vi } from "vitest";
import { createHttpPolishClient } from "./polish-client";
import type { PolishResult } from "./types";

/**
 * Tests for the HTTP adapter to `/api/polish`.
 *
 * This is where the payload-shape defensive code used to live inline
 * in the store. It now lives in one place with one purpose: turn the
 * wire into a typed `PolishResult` via `PolishResultSchema`. The
 * store tests (`entries-store.test.ts`) inject a `FakePolishClient`
 * and don't exercise any of this.
 */

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function clientWith(fetchImpl: unknown) {
  return createHttpPolishClient({
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

describe("createHttpPolishClient", () => {
  it("POSTs JSON to /api/polish with rawTranscript + category", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        ok: true,
        polishedText: "Buy milk.",
        model: "m",
        promptVersion: 1,
      }),
    );
    const client = clientWith(fetchImpl);

    await client.polish({ rawTranscript: "buy milk", category: "todo" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/polish");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      rawTranscript: "buy milk",
      category: "todo",
    });
  });

  it("returns the parsed success payload on 200", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        ok: true,
        polishedText: "Buy milk.",
        model: "gemini-test",
        promptVersion: 3,
      }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({
      ok: true,
      polishedText: "Buy milk.",
      model: "gemini-test",
      promptVersion: 3,
    } satisfies PolishResult);
  });

  it.each([
    { reason: "too-long", status: 400 },
    { reason: "bad-request", status: 400 },
    { reason: "timeout", status: 504 },
  ] as const)(
    "passes through `%s` without retryAfterMs",
    async ({ reason, status }) => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse({ ok: false, reason }, { status }),
      );
      const result = await clientWith(fetchImpl).polish({
        rawTranscript: "x",
        category: "todo",
      });
      expect(result).toEqual({ ok: false, reason });
    },
  );

  it.each(["rate-limited", "quota-exhausted"] as const)(
    "passes through %s without retryAfterMs",
    async (reason) => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse({ ok: false, reason }, { status: 429 }),
      );
      const result = await clientWith(fetchImpl).polish({
        rawTranscript: "x",
        category: "todo",
      });
      expect(result).toEqual({ ok: false, reason });
    },
  );

  it.each(["rate-limited", "quota-exhausted"] as const)(
    "preserves retryAfterMs on %s",
    async (reason) => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          { ok: false, reason, retryAfterMs: 2000 },
          { status: 429 },
        ),
      );
      const result = await clientWith(fetchImpl).polish({
        rawTranscript: "x",
        category: "todo",
      });
      expect(result).toEqual({ ok: false, reason, retryAfterMs: 2000 });
    },
  );

  it("passes through { ok: false; reason: 'upstream'; status } from the server", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: false, reason: "upstream", status: 500 }, { status: 502 }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 500 });
  });

  it("degrades unknown reason strings to 'upstream'", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: false, reason: "teapot" }, { status: 418 }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 418 });
  });

  it("network throw → upstream with status 0 (no HTTP response to quote)", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("boom");
    });
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 0 });
  });

  it("never throws on a network error", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("boom");
    });
    await expect(
      clientWith(fetchImpl).polish({ rawTranscript: "x", category: "todo" }),
    ).resolves.toBeDefined();
  });

  it("malformed JSON body → upstream with the response's HTTP status", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("{not json", {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("non-object payload → upstream", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse("nope"));
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("ok:true payload missing polishedText → upstream", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: true, model: "m", promptVersion: 1 }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("ok:true payload with non-string polishedText → upstream", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: true, polishedText: 42, model: "m", promptVersion: 1 }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("ok:true payload with non-number promptVersion → upstream", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ok: true, polishedText: "x", model: "m", promptVersion: "1" }),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("neither ok:true nor ok:false → upstream", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: "maybe" }));
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 200 });
  });

  it("non-number retryAfterMs on rate-limited → upstream (whole payload fails schema)", async () => {
    // The hand-rolled validator used to silently drop a bogus
    // retryAfterMs and keep the reason. The zod schema rejects the
    // whole payload instead — the wire contract is precise, and a
    // malformed field means the body is not trustworthy.
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { ok: false, reason: "rate-limited", retryAfterMs: "2000" },
        { status: 429 },
      ),
    );
    const result = await clientWith(fetchImpl).polish({
      rawTranscript: "x",
      category: "todo",
    });
    expect(result).toEqual({ ok: false, reason: "upstream", status: 429 });
  });
});
