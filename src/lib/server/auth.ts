/**
 * Auth factory — lazy, per-isolate, memoised by D1 binding reference.
 *
 * Splits responsibilities deliberately:
 *   - This module knows how to assemble a better-auth instance given a
 *     D1 binding + a bag of string secrets. It has NO SvelteKit imports
 *     (no `$env/*`, no `$app/*`) so that `@better-auth/cli generate`
 *     can load it directly in a plain Node context to emit the schema.
 *   - Runtime callers (`+server.ts`, future `hooks.server.ts`) read
 *     secrets from `$env/dynamic/private` and pass them in.
 *
 * Memoisation uses a `WeakMap` keyed by the D1 binding reference. Within
 * a single Workers isolate the binding is stable, so the map holds a
 * single entry. If dev-time platform proxies recreate the binding, the
 * map transparently rebuilds — no correctness issue, just a one-off
 * reconstruction cost.
 */
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { error, type RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

import { isAllowed, parseAllowlist } from "./allowlist";
import * as schema from "./db/schema";

export type AuthSecrets = {
  secret: string;
  googleClientId: string;
  googleClientSecret: string;
  /** Raw `EMAIL_ALLOWLIST` env value — comma-separated emails,
   * case-insensitive. See `allowlist.ts` for the parser. */
  emailAllowlist: string;
  /** Origin of the current request. Used by better-auth to build OAuth
   * callback URLs. Derive from `event.url.origin` at call sites. */
  baseURL?: string;
};

/**
 * Narrowed user shape exposed to the rest of the app.
 *
 * `requireUser` projects better-auth's `User` down to these four fields
 * before returning and before writing to `event.locals.user`. The
 * projection is the structural version of invariant 12 in `CONTEXT.md`
 * ("never return `event.locals.user` wholesale from a server `load`"):
 * with this shape there is nothing dangerous to leak — returning it
 * wholesale is safe by construction.
 *
 * If a route genuinely needs another field from the better-auth user
 * row, widen this type deliberately (and audit whether the new field
 * is safe to send to the client).
 */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
};

function build(db: D1Database, secrets: AuthSecrets) {
  const allowlist = parseAllowlist(secrets.emailAllowlist);
  return betterAuth({
    database: drizzleAdapter(drizzle(db, { schema }), {
      provider: "sqlite",
      schema,
    }),
    secret: secrets.secret,
    baseURL: secrets.baseURL,
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: secrets.googleClientId,
        clientSecret: secrets.googleClientSecret,
      },
    },
    session: {
      // 30-day sliding session — chosen to be compatible with a future
      // offline-cached-cookie flow (see PRD "Further Notes"). A user
      // returning after two weeks offline still has a valid cookie;
      // `updateAge` refreshes active users so the cookie stays fresh.
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: "better-auth",
    },
    databaseHooks: {
      user: {
        create: {
          /**
           * Reject non-allowlisted emails at account creation.
           *
           * This is the first of two allowlist gates (see ADR 0003). The
           * second is in `requireUser()` (Slice 4), which re-checks on
           * every request so removing an email from the allowlist takes
           * effect on the next call without DB cleanup.
           *
           * Throwing `APIError` here causes better-auth to redirect to
           * the configured `onAPIError.errorURL` below (or to the
           * per-request `errorCallbackURL` when the client supplies one).
           */
          before: async (user) => {
            if (!isAllowed(user.email, allowlist)) {
              throw new APIError("FORBIDDEN", {
                message: "not_allowlisted",
              });
            }
          },
        },
      },
    },
    onAPIError: {
      // Coarse default: any API error during the OAuth flow lands here.
      // The allowlist rejection is the dominant case today; other
      // failures produce the same toast ("sign-in failed") via the
      // layout's query-param handler (Slice 5). Refining per-error-code
      // redirects can happen when we have more failure modes to
      // distinguish.
      errorURL: "/?auth_error=not_allowlisted",
    },
  });
}

const cache = new WeakMap<D1Database, ReturnType<typeof build>>();

/**
 * Return a better-auth instance bound to the given platform and secrets.
 *
 * Pure factory — knows nothing about SvelteKit. Runtime code normally
 * goes through `authForEvent(event)` instead; this entry point exists
 * for tests and any future caller that already has a `(platform,
 * secrets)` pair in hand.
 */
export function getAuth(platform: App.Platform, secrets: AuthSecrets) {
  const db = platform.env.AUTH_DB;
  let instance = cache.get(db);
  if (!instance) {
    instance = build(db, secrets);
    cache.set(db, instance);
  }
  return instance;
}

/**
 * SvelteKit-aware wrapper around `getAuth`: the single seam between a
 * `RequestEvent` and a configured better-auth instance.
 *
 * Concentrates (a) the env-var names auth depends on and (b) the
 * `baseURL = event.url.origin` convention into one place. Every
 * request-scoped caller — `requireUser`, the `/api/auth/[...all]`
 * mount, any future hook — should go through here rather than
 * assembling `AuthSecrets` inline. Adding a new secret is then a
 * one-file diff.
 *
 * Kept out of the pure `getAuth` / `build` path so `auth.cli.ts` can
 * still load this module under `@better-auth/cli` without a
 * SvelteKit runtime.
 */
/**
 * Derive the externally-visible origin.
 *
 * Behind a reverse proxy (cloudflared tunnel, CF Pages, etc.) TLS is
 * terminated upstream and the dev server sees plain HTTP, so
 * `event.url.origin` reports `http://...` even though the browser
 * used `https://`. better-auth would then hand Google an `http://`
 * redirect_uri that doesn't match the one registered in the OAuth
 * client → 400 redirect_uri_mismatch. Prefer `X-Forwarded-Proto` /
 * `X-Forwarded-Host` when the proxy sets them.
 */
function externalOrigin(event: RequestEvent): string {
  const h = event.request.headers;
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim();
  const host = h.get('x-forwarded-host')?.split(',')[0].trim() ?? h.get('host');
  if (proto && host) return `${proto}://${host}`;
  return event.url.origin;
}

export function authForEvent(event: RequestEvent) {
  return getAuth(event.platform!, {
    secret: env.BETTER_AUTH_SECRET,
    googleClientId: env.GOOGLE_CLIENT_ID,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    emailAllowlist: env.EMAIL_ALLOWLIST ?? '',
    baseURL: externalOrigin(event),
  });
}

/**
 * Internal helper shared with `auth.cli.ts`. Exported only so the
 * CLI config can construct a stub instance for schema introspection.
 * Runtime code must go through `getAuth()`.
 */
export { build as _buildAuthForCLI };

/**
 * The single server-side auth gate for `/api/*` routes.
 *
 * Behaviour:
 *   1. Asks better-auth for the current session using the request
 *      headers (session cookie).
 *   2. On missing / invalid session → `error(401, 'unauthenticated')`.
 *   3. Re-checks the email against `EMAIL_ALLOWLIST`. This is the
 *      second allowlist gate (see ADR 0003); removing someone from
 *      the env takes effect on the very next request without any DB
 *      cleanup. → `error(401, 'not_allowlisted')`.
 *   4. On success, populates `event.locals.user` with a narrowed
 *      `CurrentUser` and returns it.
 *
 * The narrowed shape is deliberate: the full better-auth `User`
 * carries fields that must not reach the client payload. Projecting
 * here means downstream `load` functions can return `locals.user`
 * wholesale without re-applying a per-field cherry-pick (the
 * structural version of invariant 12 in `CONTEXT.md`).
 *
 * Deliberately a thin composition over `authForEvent` + the pure
 * `allowlist` module — no extra policy lives here. If you need to
 * branch on role / claim / feature flag, layer it on top in the
 * route; don't grow this function.
 *
 * Callers: route handlers under `src/routes/api/**` that must be
 * protected. The route-coverage test (`route-coverage.test.ts`)
 * asserts every `/api/*` route either calls `requireUser` or is
 * listed in `PUBLIC_API_ROUTES`.
 */
export async function requireUser(event: RequestEvent): Promise<CurrentUser> {
  const auth = authForEvent(event);

  const result = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (!result?.session || !result.user) {
    throw error(401, "unauthenticated");
  }

  // Re-check allowlist on every request — intentional. The set
  // is small and parsing is cheap; doing it per-request means the
  // allowlist env var is the single source of truth for access.
  const allowlist = parseAllowlist(env.EMAIL_ALLOWLIST ?? "");
  if (!isAllowed(result.user.email, allowlist)) {
    throw error(401, "not_allowlisted");
  }

  const currentUser: CurrentUser = {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    image: result.user.image ?? null,
  };
  event.locals.user = currentUser;
  return currentUser;
}
