/**
 * Auth policy — which `/api/*` routes are allowed to skip `requireUser`.
 *
 * Pure module: no imports from better-auth, SvelteKit, or any runtime.
 * Deliberately separated from `auth.ts` so the route-coverage test can
 * import it without pulling in D1/better-auth.
 *
 * Semantics:
 *   - Leaf entries (those not treated as prefixes) match by exact path.
 *   - Namespace entries (currently `/api/auth`) match the entry itself
 *     AND anything beneath it (`/api/auth/...`). `better-auth` mounts
 *     its full surface under `/api/auth/*`, so we treat the whole
 *     subtree as public; better-auth manages its own auth state.
 *
 * If you add a new public route, list it here and nowhere else — the
 * route-coverage test is the only reader.
 */

/** Paths / path-prefixes that are allowed to skip `requireUser`. */
export const PUBLIC_API_ROUTES: readonly string[] = [
	'/api/debug-log',
	'/api/auth',
];

/** Entries from `PUBLIC_API_ROUTES` that match as a namespace (prefix). */
const NAMESPACE_ROUTES: readonly string[] = ['/api/auth'];

/**
 * Return true iff `path` is allowed to skip `requireUser`.
 *
 * `path` is the route path (the directory under `src/routes/` with
 * leading slash), e.g. `/api/debug-log` or `/api/auth/[...all]`.
 */
export function isPublicRoute(path: string): boolean {
	for (const entry of PUBLIC_API_ROUTES) {
		if (NAMESPACE_ROUTES.includes(entry)) {
			if (path === entry || path.startsWith(entry + '/')) return true;
		} else if (path === entry) {
			return true;
		}
	}
	return false;
}
