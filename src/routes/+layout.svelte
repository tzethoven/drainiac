<script lang="ts">
	import { browser } from "$app/environment";
	import favicon from '$lib/assets/favicon.svg';
	import {
		createEntriesStore,
		setEntriesContext,
	} from "$lib/stores/entries-store.svelte";
	import '../app.css';

	let { children } = $props();

	// Only construct in the browser — localStorage is unavailable during SSR.
	setEntriesContext(
		createEntriesStore({
			storage: browser ? localStorage : undefined,
		}),
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
