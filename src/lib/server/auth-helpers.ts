import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Ensures the user is authenticated. Redirects to login if not.
 * Use in +page.server.ts load functions for protected routes.
 */
export function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw redirect(302, '/login');
	}
	return event.locals.user;
}

/**
 * Redirects authenticated users away from public-only pages (like login).
 * Use in +page.server.ts load functions for login/register pages.
 */
export function requireGuest(event: RequestEvent, redirectTo: string = '/app') {
	if (event.locals.user) {
		throw redirect(302, redirectTo);
	}
}
