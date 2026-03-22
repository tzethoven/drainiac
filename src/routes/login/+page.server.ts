import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { requireGuest } from '$lib/server/auth-helpers';

export const load: PageServerLoad = async (event) => {
	requireGuest(event);
	return {};
};

export const actions: Actions = {
	signInGoogle: async (event) => {
		const formData = await event.request.formData();
		const callbackURL = formData.get('callbackURL')?.toString() ?? '/app';

		const result = await auth.api.signInSocial({
			body: {
				provider: 'google',
				callbackURL
			}
		});

		if (result.url) {
			return redirect(302, result.url);
		}
		return fail(400, { message: 'Google sign-in failed' });
	}
};
