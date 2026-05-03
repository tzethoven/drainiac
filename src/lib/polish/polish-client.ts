/**
 * Client-side adapter for `POST /api/polish`.
 *
 * This module owns the wire contract with the polish endpoint:
 * constructing the request, parsing the response body, and coercing
 * arbitrary payloads back to a typed `PolishResult`. The entries store
 * consumes a `PolishClient` by interface so tests can inject a
 * `FakePolishClient` returning typed values instead of hand-rolling
 * `Response` objects.
 *
 * Invariant: `polish()` never throws. Network throws, non-JSON
 * responses, and payloads outside the server taxonomy all resolve to
 * `{ ok: false; reason: "upstream", status: 0 }` (status 0 = "no HTTP
 * status to quote", matching the server's own sentinel for missing
 * config). `retryAfterMs` on `rate-limited` / `quota-exhausted` is
 * preserved when the server sends it.
 *
 * Out of scope: retries, backoff, queueing. See issue #004.
 */

import type { Category } from "$lib/utils/transcript-parser";
import type {
  PolishFailureReason,
  PolishResult,
} from "$lib/polish/types";

export interface PolishRequest {
  rawTranscript: string;
  category: Category;
}

export interface PolishClient {
  polish(req: PolishRequest): Promise<PolishResult>;
}

export interface HttpPolishClientOptions {
  /** Override for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
}

/**
 * HTTP adapter talking to `POST /api/polish`.
 */
export function createHttpPolishClient(
  opts: HttpPolishClientOptions = {},
): PolishClient {
  const fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));

  return {
    async polish(req: PolishRequest): Promise<PolishResult> {
      let response: Response;
      try {
        response = await fetchImpl("/api/polish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            rawTranscript: req.rawTranscript,
            category: req.category,
          }),
        });
      } catch {
        // Network throw \u2014 no response at all.
        return upstream(0);
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return upstream(response.status);
      }

      return coerceResult(payload, response.status);
    },
  };
}

/**
 * Coerce an unknown JSON payload into the `PolishResult` union.
 *
 * The server emits payloads exactly matching the union; this function
 * defends against a bad proxy, a stale client talking to a newer
 * server, or a malicious response. Anything outside the taxonomy
 * degrades to `upstream`.
 */
function coerceResult(payload: unknown, status: number): PolishResult {
  if (!isObject(payload)) return upstream(status);

  if (payload.ok === true) {
    const { polishedText, model, promptVersion } = payload as {
      polishedText: unknown;
      model: unknown;
      promptVersion: unknown;
    };
    if (
      typeof polishedText !== "string" ||
      typeof model !== "string" ||
      typeof promptVersion !== "number"
    ) {
      return upstream(status);
    }
    return { ok: true, polishedText, model, promptVersion };
  }

  if (payload.ok !== false) return upstream(status);

  const reason = coerceReason(payload.reason);
  switch (reason) {
    case "rate-limited":
    case "quota-exhausted": {
      const retryAfterMs =
        typeof payload.retryAfterMs === "number" ? payload.retryAfterMs : undefined;
      return retryAfterMs === undefined
        ? { ok: false, reason }
        : { ok: false, reason, retryAfterMs };
    }
    case "upstream": {
      // Prefer the server's own status hint when it sent one; otherwise
      // fall back to the HTTP status of the response we received.
      const payloadStatus =
        typeof payload.status === "number" ? payload.status : status;
      return { ok: false, reason: "upstream", status: payloadStatus };
    }
    case "too-long":
    case "bad-request":
    case "timeout":
      return { ok: false, reason };
  }
}

function upstream(status: number): PolishResult {
  return { ok: false, reason: "upstream", status };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

const KNOWN_REASONS: ReadonlySet<PolishFailureReason> = new Set([
  "too-long",
  "bad-request",
  "rate-limited",
  "quota-exhausted",
  "timeout",
  "upstream",
]);

/** Trust the server's `reason` when it's in the taxonomy; else `upstream`. */
function coerceReason(reason: unknown): PolishFailureReason {
  return typeof reason === "string" &&
    KNOWN_REASONS.has(reason as PolishFailureReason)
    ? (reason as PolishFailureReason)
    : "upstream";
}
