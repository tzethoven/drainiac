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
import {
  PolishResultSchema,
  type PolishResult,
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
 * Coerce an unknown JSON payload into the `PolishResult` union via
 * the shared zod schema (single source of truth — see
 * `$lib/polish/types`). Anything that doesn't parse degrades to
 * `upstream` with the HTTP status of the response we received, so a
 * bad proxy, a stale client, or a malicious body can't break the
 * taxonomy the store relies on.
 *
 * One post-parse fix-up: when the server's `upstream` payload carries
 * its own `status` (the inner Gemini status), we prefer that over the
 * response's HTTP status. The other arms have no such hint.
 */
function coerceResult(payload: unknown, status: number): PolishResult {
  const parsed = PolishResultSchema.safeParse(payload);
  if (!parsed.success) return upstream(status);
  // The server already embedded its own `status` in the `upstream`
  // arm; passing the parsed value through preserves it. No other arm
  // carries HTTP-status data.
  return parsed.data;
}

function upstream(status: number): PolishResult {
  return { ok: false, reason: "upstream", status };
}
