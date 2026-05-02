/// <reference types="@cloudflare/workers-types" />
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { CurrentUser } from '$lib/server/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			// Populated by `requireUser` on protected routes. Deliberately
			// narrowed to `CurrentUser` rather than the full better-auth
			// `User` so downstream `load` functions can return it wholesale
			// (structural form of invariant 12 in `CONTEXT.md`). The
			// better-auth `Session` is intentionally not exposed here —
			// nothing outside the auth gate needs it, and keeping it off
			// `locals` removes a foot-gun for future server `load`s.
			user: CurrentUser | null;
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: {
				AUTH_DB: D1Database;
			};
			context: { waitUntil(promise: Promise<unknown>): void };
			caches: CacheStorage & { default: Cache };
		}
	}

	interface Window {
		SpeechRecognition: typeof SpeechRecognition;
		webkitSpeechRecognition: typeof SpeechRecognition;
	}
}

export {};
