/**
 * Auth factory — Slice 1 stub.
 *
 * This file exists at this stage only so that `@better-auth/cli generate`
 * has a config to introspect when emitting the Drizzle schema. It is
 * deliberately minimal: no route wiring, no allowlist, no request-time
 * callers. Slice 2 (`tracer-bullet OAuth`) fills in the real factory.
 *
 * Do not import this from any route yet.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';

import * as schema from './db/schema';

/**
 * Build a better-auth instance for schema-generation purposes.
 *
 * `@better-auth/cli generate` imports this module in a Node context
 * without a real D1 binding, so we hand it a `null`-like DB via a cast.
 * The CLI only walks the adapter/plugin shape to derive tables; it
 * never executes queries.
 */
export function getAuth(db: D1Database) {
	return betterAuth({
		database: drizzleAdapter(drizzle(db, { schema }), {
			provider: 'sqlite',
			schema,
		}),
		emailAndPassword: { enabled: false },
		socialProviders: {
			google: {
				clientId: '',
				clientSecret: '',
			},
		},
	});
}

// Default export consumed by `@better-auth/cli generate`.
export const auth = getAuth({} as unknown as D1Database);
