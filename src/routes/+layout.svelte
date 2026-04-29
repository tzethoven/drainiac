<script lang="ts">
	import { browser } from "$app/environment";
	import favicon from '$lib/assets/favicon.svg';
	import {
		createEntriesStore,
		setEntriesContext,
	} from "$lib/stores/entries-store.svelte";
	import { createToastStore, setToastContext } from "$lib/stores/toast-store.svelte";
	import Toast from "$lib/components/Toast.svelte";
	import '../app.css';

	let { children } = $props();

	// Only construct in the browser — localStorage is unavailable during SSR.
	setEntriesContext(
		createEntriesStore({
			storage: browser ? localStorage : undefined,
		}),
	);

	setToastContext(createToastStore());
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
