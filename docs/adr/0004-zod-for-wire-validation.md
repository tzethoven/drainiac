# ADR-0004: Zod for HTTP wire validation

- **Status:** Accepted
- **Date:** 2026-05-03

## Context

Memento's first server route — `POST /api/polish` — exchanges a
typed wire contract between three places that all had to agree on
the same shape by convention:

1. `src/routes/api/polish/+server.ts` parsed the request body with
   hand-rolled `typeof` checks against `unknown`, then branched the
   failure taxonomy into `bad-request` / `too-long`.
2. `src/lib/polish/polish-client.ts` parsed the response body the
   same way — an `isObject` helper, a `coerceReason` allow-list, and
   a switch over every arm of the `PolishResult` union. The union
   was declared separately in `$lib/polish/types.ts`, so a drift
   between "what the type says" and "what the coercer accepts" was
   only caught by tests.
3. `src/lib/server/polish/gemini.ts` walked Gemini's
   `candidates[0].content.parts[0].text` shape with three nested
   `typeof … && "x" in y` ladders, then hand-validated the inner
   JSON (`{ polished: string }`).

Three `unknown`-to-typed bridges, three different styles, all
re-declaring shape invariants the type system already knew about.
Adding a second server route would have made four.

Two forces pushed this toward a schema library:

- **Single source of truth.** `PolishResult` was a TypeScript union
  and — separately — a coercer that accepted that union's shape.
  The schema + `z.infer` folds those into one declaration; a new
  arm can't be added to the type without the validator knowing
  about it, and vice versa.
- **Route hygiene going forward.** Any future `/api/*` handler will
  need the same `bad-request` discipline. If the second route is
  written the same way as the first, the pattern crystallises as
  "write a little parser"; if we adopt a schema lib now, the next
  route is three lines of `Schema.safeParse`.

Against adoption: bundle size. Memento is a PWA and new client-side
dependencies land in the shell. Zod v3 is ~13 KB gzip; zod v4
classic (current) is closer to ~24 KB gzip on top of an app that
was 154 KB total. That is a real cost for a thousand-line feature.

## Decision

Adopt **`zod` v4** (classic API) as a runtime dependency. Use it
for every `unknown`-to-typed bridge in the polish pipeline:

- `src/lib/polish/types.ts` exports `PolishRequestSchema` and
  `PolishResultSchema`; `PolishResult = z.infer<typeof
  PolishResultSchema>` is now derived from the schema, and
  `PolishFailureReason` is `Extract<PolishResult, { ok: false }>
  ["reason"]` — taxonomy changes happen in exactly one place.
- The polish route validates the request body in two stages
  (`safeParse` on the shape → length check against
  `MAX_POLISH_TRANSCRIPT_CHARS`) so the wire-level
  `bad-request` vs `too-long` distinction is preserved.
- `polish-client.ts` replaces `coerceResult` with
  `PolishResultSchema.safeParse(payload)`; a parse failure
  degrades to `{ ok: false, reason: "upstream", status }`.
- `gemini.ts` replaces `extractText`'s hand-rolled walk with
  `GeminiResponseSchema.safeParse`, and validates the inner
  polished JSON against `PolishedPayloadSchema`.

`PolishResultSchema` is composed as a `z.union` of a success object
and a `z.discriminatedUnion("reason", [...])` over the failure arms
rather than a single discriminated union on `ok`: zod v4 rejects a
discriminated union with duplicate discriminator values (`ok: false`
appears on every failure arm), and nesting on `reason` is the
closest equivalent with runtime speed-ups on the branch that needs
them most.

`PolishRequestSchema` bakes the length cap into the *shape* for
callers that want a one-shot validator. The route deliberately does
**not** reuse it — it uses a shape-only schema so it can map
length failures to the `too-long` reason (not `bad-request`).

Only the polish pipeline is migrated in this slice. Other
`/api/*` handlers (today: `/api/debug-log`, `/api/voice-capture`)
stay as they are; they move to zod when they're next touched, so
we don't take the bundle-size hit for a code path that's about to
be rewritten anyway.

**Not touched by this ADR:**

- `localStorage` / migration validation (`entries-migrations.ts`).
  Schema evolution there is an explicit version-bump problem with
  its own invariants; zod would conflate "this byte string is a
  v1 entry" with "this byte string is current". The migration
  system stays hand-rolled.
- User-facing copy (`POLISH_FAILURE_MESSAGES`). Zod's default
  issues are fine for server logs; product voice lives in the
  message record.

## Consequences

**Positive**

- **One declaration per wire type.** Removing or adding a failure
  reason is a single edit in `$lib/polish/types.ts`; the compiler
  and the runtime both update.
- **Precise failure handling.** `safeParse` is strictly stricter
  than the old `typeof` ladders: a malformed field in an otherwise
  valid payload now degrades to `upstream` instead of being
  silently dropped (example: `retryAfterMs: "2000"`). The wire
  contract is either honoured or it isn't.
- **Pattern ready for reuse.** The next `/api/*` route adopts
  zod for free — three lines, no hand-rolled coercion.
- **Shared schemas, not just shared types.** Client and server
  already imported types from `$lib/polish/types`; they now share
  the *validator* too, so the "does this payload match the
  contract" question has exactly one answer on both sides.

**Negative**

- **Bundle size.** Client `.svelte-kit/output/client` total went
  from ~154 KB to ~222 KB raw (delta ~68 KB / ~24 KB gzip).
  Larger than a rough zod v3 estimate because we're on zod v4
  classic. Acceptable for now; see Re-visit below.
- **Discriminated-union shape is awkward.** Zod v4 forbids
  duplicate discriminator values, so `PolishResultSchema` is a
  `union` of `success` + `discriminatedUnion("reason", …)` rather
  than a flat `discriminatedUnion("ok", …)`. Slightly harder to
  read; no runtime consequence.
- **Version pin matters.** Zod majors have reshaped the API twice
  now (v3 → v4). Pinning to a minor and bumping deliberately is
  mandatory; a blind upgrade could break the schemas.

## Alternatives considered

- **`zod/mini`.** Same runtime, smaller bundle (~6–8 KB gzip
  goal), but a different call shape (`z.string().check(z.minLength(1))`
  instead of `.min(1)`). Not adopted now because the classic API
  reads closer to the hand-rolled code it replaces; easy to swap
  later if the bundle becomes a real constraint (see Re-visit).
- **`valibot`.** Smaller bundle, object-style API, very similar
  expressiveness for this use case. Rejected because `better-auth`
  (already a server-side dependency; see ADR-0003) ships zod
  internally, and adding a second schema lib to the project just
  to save a few KB would double the churn surface without a
  matching win.
- **`arktype`.** Compelling type-level story. Rejected as
  overkill for the four schemas we need; also younger than zod,
  less predictable upgrade cadence.
- **Keep hand-rolled `typeof` everywhere.** The status quo. Viable
  for one route; tips over as soon as a second route needs the
  same plumbing. Rejected now rather than later so the second
  route doesn't ship with another hand-rolled parser.
- **Schema per module, no shared source of truth.** Put zod in the
  client and the server independently, re-declare shapes.
  Rejected — it recreates the drift problem this ADR exists to
  solve.

## Re-visit when

- Bundle size becomes a real product constraint. Migration path:
  switch imports in `$lib/polish/types.ts` and the validators to
  `zod/mini`, update the two `.min(n)` chains to `.check(z.minLength(n))`.
  The schemas and inferred types stay the same.
- A second schema library is proposed for a different reason
  (e.g. form validation in Svelte). At that point, consolidate on
  one or formally accept two.
- Cloudflare Workers start enforcing a bundle-size ceiling close
  to our current total. We're well inside the 1 MB limit today;
  worth checking at the next platform review.
- Zod v5 ships. Re-read this ADR, re-run the bundle-size check,
  decide whether the upgrade is free or whether we should freeze
  on v4.
