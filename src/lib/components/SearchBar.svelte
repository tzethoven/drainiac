<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { onSearch }: { onSearch?: (query: string) => void } = $props();

	let searchInput = $state<HTMLInputElement | null>(null);
	let query = $state('');
	let isFocused = $state(false);

	// Keyboard shortcut: Cmd/Ctrl + K
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			searchInput?.focus();
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (query.trim()) {
			if (onSearch) {
				onSearch(query);
			} else {
				// Navigate to search results page
				goto(`/search?q=${encodeURIComponent(query)}`);
			}
		}
	}

	function clearSearch() {
		query = '';
		searchInput?.focus();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<form onsubmit={handleSubmit} class="search-bar">
	<div class="search-input-wrapper">
		<svg
			class="search-icon"
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.35-4.35" />
		</svg>

		<input
			bind:this={searchInput}
			bind:value={query}
			type="text"
			placeholder="Search anything... (⌘K)"
			class="search-input"
			onfocus={() => (isFocused = true)}
			onblur={() => (isFocused = false)}
		/>

		{#if query}
			<button
				type="button"
				onclick={clearSearch}
				class="clear-button"
				aria-label="Clear search"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		{/if}
	</div>
</form>

<style>
	.search-bar {
		width: 100%;
		max-width: 500px;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		transition: all var(--timing-fast) var(--ease-out);
	}

	.search-input-wrapper:focus-within {
		border-color: var(--primary);
		box-shadow: 0 0 0 3px var(--primary) / 0.1;
	}

	.search-icon {
		position: absolute;
		left: var(--spacing-md);
		color: var(--muted-foreground);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md) var(--spacing-sm) calc(var(--spacing-md) * 3);
		background: transparent;
		border: none;
		outline: none;
		color: var(--foreground);
		font-size: var(--font-size-base);
	}

	.search-input::placeholder {
		color: var(--muted-foreground);
	}

	.clear-button {
		position: absolute;
		right: var(--spacing-sm);
		padding: var(--spacing-xs);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.clear-button:hover {
		background: var(--muted);
		color: var(--muted-foreground);
	}

	.clear-button:active {
		transform: scale(0.95);
	}
</style>
