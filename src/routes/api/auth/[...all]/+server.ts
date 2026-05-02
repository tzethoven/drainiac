/**
 * better-auth SvelteKit handler — mounts the full auth surface under
 * `/api/auth/*`. Handles OAuth sign-in, callback, sign-out, and
 * `get-session`. Exempt from `requireUser` (see `PUBLIC_API_ROUTES` —
 * Slice 4); better-auth manages its own auth state internally.
 */
import { env } from '$env/dynamic/private';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

import { getAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const handler: RequestHandler = (event) => {
	const auth = getAuth(event.platform!, {
		secret: env.BETTER_AUTH_SECRET,
		googleClientId: env.GOOGLE_CLIENT_ID,
		googleClientSecret: env.GOOGLE_CLIENT_SECRET,
		baseURL: event.url.origin,
	});
	return toSvelteKitHandler(auth)(event);
};

export const GET = handler;
export const POST = handler;
