# Extract a `PolishClient` adapter — give the store a real seam to `/api/polish`

## Parent

Architecture review (improve-codebase-architecture, 2026-05-02).

## What to build

`entriesStore.polish(id)` today is ~80 lines that mix four unrelated
concerns: in-flight conflict detection, HTTP transport, response-shape
validation, and store mutation. It also re-parses the `PolishResult`
union from `unknown` by hand, duplicating the contract the server
already defines. The `fetchImpl` option is a hypothetical seam — one
real adapter (global `fetch`), one test mock built out of hand-rolled
`Response` objects.

Introduce a real seam: a `PolishClient` module owning the wire
contract with `/api/polish`, with the store depending on it by
interface.

### Scope

1. **Lift `PolishResult` into `$lib/polish/types.ts`.** Today it lives
   in `$lib/server/polish/gemini.ts` and the client re-derives it. Make
   it the shared wire type. `PolishFailureReason` stays (it's the
   discriminant of `PolishResult`'s failure arm).

2. **New module: `src/lib/polish/polish-client.ts`.**

   ```ts
   export interface PolishRequest {
     rawTranscript: string;
     category: Category;
   }

   export interface PolishClient {
     polish(req: PolishRequest): Promise<PolishResult>;
   }

   export function createHttpPolishClient(
     opts?: { fetchImpl?: typeof fetch },
   ): PolishClient;
   ```

   The HTTP adapter owns: constructing the `POST /api/polish` request,
   parsing the JSON body, and coercing to `PolishResult`. Network
   throws, non-JSON responses, and payloads outside the taxonomy all
   resolve to `{ ok: false; reason: "upstream" }`. The adapter never
   throws. `retryAfterMs` is preserved when present.

3. **Store refactor.** `EntriesStoreOptions.fetchImpl` is replaced by
   `polishClient?: PolishClient`; default is `createHttpPolishClient()`.
   `entriesStore.polish(id)` shrinks to:
   - preflight length guard (stays in the store — it's a store-side UX
     choice, not a transport concern),
   - `polishingIds.add(id)`,
   - `const result = await client.polish({ rawTranscript, category })`,
   - mid-flight conflict check against `polishingIds`,
   - `switch (result.ok)` → `applyPolishResult` or `onPolishError`.

   No more `isObject`, no more `coerceReason`, no more manual
   `typeof`s. Those live in the client adapter now.

4. **Tests.**
   - New `polish-client.test.ts`: exercises the full HTTP error matrix
     with a mocked `fetch`, asserting the `PolishResult` returned. This
     is where the `isObject` / `coerceReason` logic is tested from now
     on.
   - `entries-store.test.ts`: the polish suite stops building
     hand-rolled `Response` objects and instead injects a
     `FakePolishClient` returning typed `PolishResult` values. Tests
     read as "given `{ ok: false; reason: 'rate-limited' }`, the store
     calls `onPolishError('rate-limited')`."
   - Server route tests (`polish/server.test.ts`) unchanged — they
     already assert against the wire format.

### Not in scope

- Changing the wire contract (status codes, reason taxonomy, response
  shape) — this is a pure refactor.
- Changing `onPolishError`'s signature.
- Retrying, backoff, queueing — explicitly out of scope (see #004).
- Moving the preflight length guard — stays in the store.

## Acceptance criteria

- [ ] `PolishResult` is defined once, in `$lib/polish/types.ts`, and
      imported by `gemini.ts`, the polish route, and the new client
      adapter.
- [ ] `src/lib/polish/polish-client.ts` exports `PolishClient`,
      `createHttpPolishClient`, and is the only place in the client
      codebase that calls `fetch("/api/polish", …)`.
- [ ] `createHttpPolishClient` never throws. Network errors, non-JSON
      bodies, and off-taxonomy payloads resolve to
      `{ ok: false; reason: "upstream" }`. `retryAfterMs` is preserved
      when the server sends it.
- [ ] `EntriesStoreOptions` exposes `polishClient?: PolishClient` and
      no longer exposes `fetchImpl` for the polish path.
- [ ] `entriesStore.polish` is significantly shorter (target: fits on
      one screen). No `isObject` / `coerceReason` / `typeof payload.*`
      checks remain in the store.
- [ ] `polish-client.test.ts` covers: 200 happy; each failure reason
      from the server with and without `retryAfterMs`; network throw
      → `upstream`; malformed JSON → `upstream`; payload shape that
      doesn't match the union → `upstream`.
- [ ] `entries-store.test.ts` polish suite uses a `FakePolishClient`,
      not a fake `fetch`. The existing behavioural assertions
      (conflict discard, in-flight set, `onPolishError` routing)
      remain.
- [ ] `npm run lint`, `npm run test`, `npm run build` pass.

## Non-goals

- Fold `entries-store` length preflight into the client (it would
  couple the adapter to store-side UX copy).
- Change how the server classifies Gemini errors (slice #004 owns
  that).

## Blocked by

None — independent of #005 and #007. Can be worked in parallel with
either.
