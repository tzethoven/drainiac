import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { requireAuth } from '$lib/server/auth-helpers';

export const load: PageServerLoad = async (event) => {
	const user = requireAuth(event);
	return { user };
};

export const actions: Actions = {
	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		return redirect(302, '/login');
	}
};
