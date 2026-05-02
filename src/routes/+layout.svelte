<script lang="ts">
	import { browser } from "$app/environment";
	import favicon from '$lib/assets/favicon.svg';
	import {
		createEntriesStore,
		setEntriesContext,
	} from "$lib/stores/entries-store.svelte";
	import { createToastStore, setToastContext } from "$lib/stores/toast-store.svelte";
	import { POLISH_FAILURE_MESSAGES } from "$lib/polish/types";
	import Toast from "$lib/components/Toast.svelte";
	import '../app.css';

	let { children } = $props();

	const toast = setToastContext(createToastStore());

	// Only construct in the browser — localStorage is unavailable during SSR.
	setEntriesContext(
		createEntriesStore({
			storage: browser ? localStorage : undefined,
			onPolishError: (reason) => toast.show(POLISH_FAILURE_MESSAGES[reason]),
		}),
	);

	/**
	 * Surface OAuth outcomes (success / rejection) via the shared toast
	 * store. The OAuth callback redirects to `/?auth_error=<reason>` on
	 * failure or `/?auth=signed_in` on success; we read the param on
	 * mount and then strip it with `history.replaceState` so a manual
	 * reload does not re-toast.
	 *
	 * Kept in the layout (not +page) because it should fire regardless
	 * of which route the callback lands on, and because the toast store
	 * is already provided here.
	 */
	$effect(() => {
		if (!browser) return;
		const url = new URL(window.location.href);
		const authError = url.searchParams.get('auth_error');
		const auth = url.searchParams.get('auth');

		if (authError === 'not_allowlisted') {
			toast.show('Your email is not on the allowlist.');
		} else if (authError) {
			toast.show('Sign-in failed.');
		} else if (auth === 'signed_in') {
			toast.show('Signed in.');
		} else {
			return;
		}

		url.searchParams.delete('auth_error');
		url.searchParams.delete('auth');
		history.replaceState(
			history.state,
			'',
			url.pathname + (url.search ? url.search : '') + url.hash,
		);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="letterbox">
	{@render children()}
	<Toast />
</div>

<style>
	/* Desktop letterbox (≥md / 768px): constrain the app to a phone-width
	 * column on a neutral dark backdrop so the mobile design isn't stretched
	 * awkwardly across a wide viewport (PRD US 34). Mobile is edge-to-edge
	 * and visually unchanged — the outer paint is fully covered by the inner.
	 */
	.letterbox {
		min-height: 100svh;
		background: var(--background);
	}

	@media (min-width: 768px) {
		.letterbox {
			background: oklch(0.205 0 0); /* neutral-900, rose-free */
		}

		.letterbox > :global(*) {
			max-width: 24rem; /* 384px — Tailwind max-w-sm, ~iPhone width */
			margin-left: auto;
			margin-right: auto;
			background: var(--background);
		}
	}
</style>
