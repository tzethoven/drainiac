# Adopt zod for HTTP wire validation (client + server)

## Parent

Follow-up to #006 (extract `PolishClient` adapter). Surfaced during
review: "shouldn't we use zod instead of hand-rolled `typeof` checks?"

## What to build

Replace the hand-rolled payload validation on both sides of
`/api/polish` with `zod` schemas, and make the schema the single
source of truth for the `PolishResult` type.

Zod is not currently a dependency. Adding it is a cross-cutting
architectural decision: this slice pays for that decision by
converting every current hand-rolled validator in the polish pipeline,
so we don't end up with one zod island surrounded by `typeof` checks.

### Scope

1. **Add `zod` as a runtime dependency.** Document the choice in a new
   ADR (`docs/adr/0004-zod-for-wire-validation.md`) — one page, the
   shape of the existing ADRs. The rationale: we have at least three
   places doing the same defensive coercion dance against `unknown`,
   and a schema lib collapses them into one declarative spec per wire
   type.

2. **`src/lib/polish/types.ts` becomes the schema source of truth.**

   ```ts
   export const PolishResultSchema = z.discriminatedUnion("ok", [
     z.object({
       ok: z.literal(true),
       polishedText: z.string(),
       model: z.string(),
       promptVersion: z.number(),
     }),
     z.object({ ok: z.literal(false), reason: z.literal("too-long") }),
     z.object({ ok: z.literal(false), reason: z.literal("bad-request") }),
     z.object({
       ok: z.literal(false),
       reason: z.literal("rate-limited"),
       retryAfterMs: z.number().optional(),
     }),
     z.object({
       ok: z.literal(false),
       reason: z.literal("quota-exhausted"),
       retryAfterMs: z.number().optional(),
     }),
     z.object({ ok: z.literal(false), reason: z.literal("timeout") }),
     z.object({
       ok: z.literal(false),
       reason: z.literal("upstream"),
       status: z.number(),
     }),
   ]);
   export type PolishResult = z.infer<typeof PolishResultSchema>;
   ```

   `PolishFailureReason` derives from the schema too, or is left as a
   literal union if inference reads worse at call sites — judgement
   call during implementation.

3. **Add `PolishRequestSchema`** covering the wire input:

   ```ts
   export const PolishRequestSchema = z.object({
     rawTranscript: z.string().min(1).max(MAX_POLISH_TRANSCRIPT_CHARS),
     category: z.enum(["todo", "note", "idea"]),
   });
   ```

   Note: the `max()` check is a shape concern; the route still needs
   to distinguish `bad-request` (empty / wrong type / invalid
   category) from `too-long` (string too long) for the failure
   taxonomy, so the route validates in two stages (see #4 below).

4. **Route: `src/routes/api/polish/+server.ts`.** Replace the
   hand-rolled body parsing with a two-stage zod pass:

   - Stage 1: `z.object({ rawTranscript: z.string().min(1), category: z.enum([...]) })`
     — if this fails, respond `bad-request`.
   - Stage 2: length check against `MAX_POLISH_TRANSCRIPT_CHARS`
     — if over, respond `too-long`.

   Keep the reason taxonomy intact. This is a pure refactor of the
   parse path.

5. **Client: `src/lib/polish/polish-client.ts`.** Replace
   `coerceResult` with `PolishResultSchema.safeParse`. On parse
   failure, fall back to `{ ok: false, reason: "upstream", status }`
   exactly as today. Network-throw and JSON-parse-throw paths are
   unchanged.

6. **Server: `src/lib/server/polish/gemini.ts`.** `extractText()`
   currently walks `payload.candidates[0].content.parts[0].text` with
   hand-rolled `typeof` checks. Replace with a zod schema:

   ```ts
   const GeminiResponseSchema = z.object({
     candidates: z.array(z.object({
       content: z.object({
         parts: z.array(z.object({ text: z.string() })).min(1),
       }),
     })).min(1),
   });
   ```

   On parse failure, return `{ ok: false, reason: "upstream", status }`
   as today.

### Not in scope

- Changing the wire contract (status codes, reason taxonomy, response
  shape). Same invariant as #006.
- Replacing zod with `valibot` / `arktype` / handrolled. The ADR
  locks the choice; alternatives can be revisited later.
- Validating `localStorage` blobs with zod. The migration system
  (`entries-migrations.ts`) handles schema evolution with explicit
  version bumps — different problem, different tool. Out of scope.
- Validating the `/api/voice-capture` endpoint or any other route.
  This slice is polish-only. Extending the pattern elsewhere happens
  as those routes are touched.

## Acceptance criteria

- [ ] `zod` is in `dependencies` (not `devDependencies` — it runs at
      request time on Cloudflare Workers).
- [ ] `docs/adr/0004-zod-for-wire-validation.md` exists and follows
      the one-page format of the existing ADRs.
- [ ] `PolishResultSchema` is defined in `$lib/polish/types.ts`;
      `PolishResult` is `z.infer<typeof PolishResultSchema>`.
- [ ] No `typeof payload.X === "string" / "number" / "object"` checks
      remain in `polish-client.ts`, the polish route, or
      `gemini.ts`. `isObject` helpers specific to polish are deleted.
- [ ] `PolishRequestSchema` is the single place the route validates
      request body shape.
- [ ] Existing behaviour preserved: every test in
      `polish-client.test.ts`, `entries-store.test.ts`,
      `server.test.ts`, and `gemini.test.ts` passes unchanged, except
      where an assertion was specifically about a hand-rolled error
      path that no longer makes sense (document each such change in
      the PR).
- [ ] Bundle-size check: record the before/after client bundle size
      in the PR description. Zod is ~12 KB min+gz; if the delta is
      materially larger, investigate tree-shaking before merging.
- [ ] `npm run check`, `npm run test`, `npm run build` pass.

## Non-goals

- Sharing zod schemas between client and server "for the first time."
  `$lib/polish/types.ts` is already isomorphic and imported by both;
  schemas sit in the same file.
- Reworking error messages. Zod's default issues are fine for logs;
  user-facing copy stays in `POLISH_FAILURE_MESSAGES`.

## Blocked by

#006 (done) — the extracted `PolishClient` is the clean place to drop
the client-side schema in. Can run in parallel with #004 follow-ups.

## Risk

- Bundle size. PWAs feel it. Mitigation: check before merge.
- Zod major-version churn. Pin to a minor and bump deliberately.
- A single test-suite "break once, update everywhere" moment when the
  schema source of truth moves. Expected; the AC calls it out.
