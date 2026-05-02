import { describe, expect, it } from 'vitest';

import { isPublicRoute, PUBLIC_API_ROUTES } from './auth-policy';

describe('isPublicRoute', () => {
	it('exact-matches the debug-log leaf entry', () => {
		expect(isPublicRoute('/api/debug-log')).toBe(true);
	});

	it('prefix-matches under the /api/auth namespace', () => {
		expect(isPublicRoute('/api/auth')).toBe(true);
		expect(isPublicRoute('/api/auth/[...all]')).toBe(true);
		expect(isPublicRoute('/api/auth/callback/google')).toBe(true);
		expect(isPublicRoute('/api/auth/sign-out')).toBe(true);
	});

	it('does not treat leaf entries as prefixes', () => {
		// /api/debug-log is a leaf, so /api/debug-log/anything must NOT match.
		expect(isPublicRoute('/api/debug-log/extra')).toBe(false);
	});

	it('does not match sibling paths that merely share a prefix string', () => {
		// `/api/authenticate` must not be considered public just because
		// it starts with the string `/api/auth`.
		expect(isPublicRoute('/api/authenticate')).toBe(false);
		expect(isPublicRoute('/api/auth-debug')).toBe(false);
	});

	it('returns false for unrelated paths', () => {
		expect(isPublicRoute('/api/entries')).toBe(false);
		expect(isPublicRoute('/api/secret')).toBe(false);
		expect(isPublicRoute('/')).toBe(false);
		expect(isPublicRoute('')).toBe(false);
	});

	it('exposes the public routes list for the route-coverage test', () => {
		// Not a behavioural check, but a tripwire: if this list is
		// silently mutated to an empty array, the coverage test would
		// still pass vacuously. Make the shape explicit.
		expect(PUBLIC_API_ROUTES.length).toBeGreaterThan(0);
		expect(PUBLIC_API_ROUTES).toContain('/api/debug-log');
		expect(PUBLIC_API_ROUTES).toContain('/api/auth');
	});
});
