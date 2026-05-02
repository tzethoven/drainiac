/**
 * Route-coverage test — the enforcement mechanism for deny-by-default
 * auth on `/api/*` endpoints.
 *
 * Invariant: every `src/routes/api/**\/+server.ts` file either
 *   (a) calls `requireUser` (textual check — cheap and stable), or
 *   (b) matches `isPublicRoute(routePath)` via `PUBLIC_API_ROUTES`.
 *
 * Anything else fails CI with a message naming the offending route,
 * so adding an unprotected endpoint is a review-time blocker rather
 * than a runtime foot-gun.
 *
 * The text match on `requireUser` is intentionally lenient: we don't
 * AST-parse, we just look for the identifier. False positives (a
 * comment mentioning `requireUser` without calling it) are possible
 * but extremely unlikely in practice, and the alternative — hand-
 * rolling an AST walk — is far more machinery than the invariant is
 * worth.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isPublicRoute } from './auth-policy';

const API_ROOT = join(process.cwd(), 'src', 'routes', 'api');

function walkServerFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walkServerFiles(full, acc);
		} else if (entry === '+server.ts') {
			acc.push(full);
		}
	}
	return acc;
}

function routePathFor(serverFile: string): string {
	// serverFile = <cwd>/src/routes/api/foo/bar/+server.ts
	// route path = /api/foo/bar
	const rel = relative(join(process.cwd(), 'src', 'routes'), serverFile);
	const dir = rel.replace(/\+server\.ts$/, '').replace(/[\\/]$/, '');
	return '/' + dir.split(sep).join('/');
}

describe('route-coverage', () => {
	const files = walkServerFiles(API_ROOT);

	it('discovers at least one API route (sanity)', () => {
		// Guards against a silent pass if the walker breaks and returns [].
		expect(files.length).toBeGreaterThan(0);
	});

	for (const file of files) {
		const routePath = routePathFor(file);
		it(`${routePath} is protected by requireUser or listed in PUBLIC_API_ROUTES`, () => {
			const source = readFileSync(file, 'utf8');
			const callsRequireUser = /\brequireUser\b/.test(source);
			const isPublic = isPublicRoute(routePath);
			expect(
				callsRequireUser || isPublic,
				`Route ${routePath} (${relative(process.cwd(), file)}) does not call requireUser() and is not listed in PUBLIC_API_ROUTES. ` +
					`Either import requireUser from '$lib/server/auth' and call it, or add this path to PUBLIC_API_ROUTES in src/lib/server/auth-policy.ts.`,
			).toBe(true);
		});
	}
});
