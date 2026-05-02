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
import { APIError, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';

import { isAllowed, parseAllowlist } from './allowlist';
import * as schema from './db/schema';

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

function build(db: D1Database, secrets: AuthSecrets) {
	const allowlist = parseAllowlist(secrets.emailAllowlist);
	return betterAuth({
		database: drizzleAdapter(drizzle(db, { schema }), {
			provider: 'sqlite',
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
			cookiePrefix: 'better-auth',
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
							throw new APIError('FORBIDDEN', {
								message: 'not_allowlisted',
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
			errorURL: '/?auth_error=not_allowlisted',
		},
	});
}

const cache = new WeakMap<D1Database, ReturnType<typeof build>>();

/**
 * Return a better-auth instance bound to the given platform and secrets.
 *
 * Call this from `+server.ts` / hooks with `event.platform!` and env
 * values read via `$env/dynamic/private`.
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
 * Internal helper shared with `auth.cli.ts`. Exported only so the
 * CLI config can construct a stub instance for schema introspection.
 * Runtime code must go through `getAuth()`.
 */
export { build as _buildAuthForCLI };

