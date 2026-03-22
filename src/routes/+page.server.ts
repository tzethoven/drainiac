import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Redirect authenticated users to app, unauthenticated to login
	if (event.locals.user) {
		return redirect(302, '/app');
	}
	return redirect(302, '/login');
};
