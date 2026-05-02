/**
 * better-auth SvelteKit handler — mounts the full auth surface under
 * `/api/auth/*`. Handles OAuth sign-in, callback, sign-out, and
 * `get-session`. Exempt from `requireUser` (see `PUBLIC_API_ROUTES` —
 * Slice 4); better-auth manages its own auth state internally.
 */
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

import { authForEvent } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const handler: RequestHandler = (event) => toSvelteKitHandler(authForEvent(event))(event);

export const GET = handler;
export const POST = handler;
