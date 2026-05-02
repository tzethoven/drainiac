/**
 * Client-side better-auth SDK — the only module browser code should
 * use to talk to the auth layer. Lives OUTSIDE `$lib/server/` so it
 * cannot accidentally import D1 / secrets.
 *
 * Exposes:
 *   - `authClient` — the raw better-auth client (`signIn`, `signOut`,
 *     `useSession`, etc.).
 *
 * The client is safe to import during SSR: all its network calls are
 * deferred to user interaction or to `useSession`'s first
 * subscription in the browser. `baseURL` is left unset so the SDK
 * derives it from `window.location` at call time — matches our
 * "same-origin API" posture.
 *
 * better-auth's Svelte flavour returns nanostores `Atom`s from
 * `useSession()`. Those atoms expose `.subscribe`, so Svelte's
 * automatic store subscription (`$session`) works directly.
 */
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();
