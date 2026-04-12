<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { createSearchStore } from '$lib/utils/search-store.svelte';
	import { createTranscriptionStore } from '$lib/utils/transcription-store.svelte';
	import { createTodoStore } from '$lib/utils/todo-store.svelte';
	import { createReadingStore } from '$lib/utils/reading-store.svelte';
	import { createWatchStore } from '$lib/utils/watch-store.svelte';
	import type { SearchableItemType } from '$lib/types/search';
	import { CATEGORIES, getCategoryInfo } from '$lib/types/transcription';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import { fade, slide } from 'svelte/transition';

	const searchStore = createSearchStore();
	const transcriptionStore = createTranscriptionStore();
	const todoStore = createTodoStore();
	const readingStore = createReadingStore();
	const watchStore = createWatchStore();

	let showFilters = $state(false);

	// Build search index from all stores
	const searchIndex = $derived(
		searchStore.buildIndex(
			transcriptionStore.transcriptions,
			todoStore.todos,
			readingStore.items,
			watchStore.items
		)
	);

	// Get query from URL with validation
	const rawQuery = $derived($page.url.searchParams.get('q') || '');
	// Limit query length to 500 characters and remove control characters
	const query = $derived.by(() => {
		const truncated = rawQuery.slice(0, 500);
		// Remove null bytes and control characters
		return truncated.replace(/[\x00-\x1F\x7F]/g, '');
	});

	// Perform search whenever query or index changes
	$effect(() => {
		searchStore.setQuery(query, searchIndex);
	});

	const results = $derived(searchStore.results);
	const filters = $derived(searchStore.filters);

	function handleSearch(newQuery: string) {
		goto(`/search?q=${encodeURIComponent(newQuery)}`);
	}

	function handleClearSearch() {
		goto('/search');
	}

	function setCategory(category: SearchableItemType | 'all') {
		searchStore.setFilters({ category }, searchIndex);
	}

	function setStatus(status: string) {
		searchStore.setFilters({ status }, searchIndex);
	}

	function toggleArchived() {
		searchStore.setFilters({ includeArchived: !filters.includeArchived }, searchIndex);
	}

	function clearAllFilters() {
		searchStore.clearFilters(searchIndex);
	}

	function getItemTypeInfo(type: SearchableItemType): { label: string; icon: string; color: string } {
		switch (type) {
			case 'todo':
				return { label: 'Todo', icon: '☑️', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
			case 'reading':
				return { label: 'Reading', icon: '📖', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
			case 'watching':
				return { label: 'Watch', icon: '▶️', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
			case 'transcription':
				return { label: 'Note', icon: '📝', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
			default:
				return { label: type, icon: '📄', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
		}
	}

	function navigateToItem(itemId: string, itemType: SearchableItemType) {
		switch (itemType) {
			case 'todo':
				goto('/todos');
				break;
			case 'reading':
				goto('/reading');
				break;
			case 'watching':
				goto('/watching');
				break;
			case 'transcription':
				goto('/');
				break;
		}
	}

	function highlightText(text: string, searchQuery: string): string {
		if (!searchQuery.trim()) return text;

		// HTML escape function
		function escapeHtml(str: string): string {
			const div = document.createElement('div');
			div.textContent = str;
			return div.innerHTML;
		}

		// Regex escape function
		function escapeRegExp(str: string): string {
			return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		// First escape the text to prevent XSS
		let escaped = escapeHtml(text);

		const keywords = searchQuery.toLowerCase().trim().split(/\s+/);

		for (const keyword of keywords) {
			// Escape regex special characters
			const escapedKeyword = escapeRegExp(keyword);
			const regex = new RegExp(`(${escapedKeyword})`, 'gi');
			escaped = escaped.replace(regex, '<mark>$1</mark>');
		}

		return escaped;
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return date.toLocaleDateString();
	}

	// Count active filters
	const activeFilterCount = $derived(
		(filters.category && filters.category !== 'all' ? 1 : 0) +
		(filters.status && filters.status !== 'all' ? 1 : 0) +
		(filters.includeArchived ? 1 : 0)
	);
</script>

<div class="container">
	<header>
		<div class="header-content">
			<h1>Search</h1>
			<ThemeToggle />
		</div>

		<div class="search-bar-container">
			<SearchBar onSearch={handleSearch} />
		</div>
	</header>

	<main>
		<div class="controls">
			<div class="results-info">
				{#if query}
					<p>
						Showing <strong>{results.length}</strong> result{results.length === 1 ? '' : 's'} for
						<strong>"{query}"</strong>
					</p>
				{:else}
					<p>Enter a search query to find items</p>
				{/if}
			</div>

			<div class="filter-controls">
				<button
					class="filter-toggle"
					onclick={() => (showFilters = !showFilters)}
					class:active={showFilters}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
					</svg>
					Filters
					{#if activeFilterCount > 0}
						<span class="filter-badge">{activeFilterCount}</span>
					{/if}
				</button>

				{#if query}
					<button class="clear-search-btn" onclick={handleClearSearch}>
						Clear Search
					</button>
				{/if}
			</div>
		</div>

		{#if showFilters}
			<div class="filters" transition:slide={{ duration: 200 }}>
				<!-- Quick Filters: Processed/Unprocessed -->
				<div class="filter-section">
					<h3>Quick Filters</h3>
					<div class="filter-chips">
						<button
							class="filter-chip"
							class:active={filters.status === 'all'}
							onclick={() => setStatus('all')}
						>
							All Items
						</button>
						<button
							class="filter-chip"
							class:active={filters.status === 'processed'}
							onclick={() => setStatus('processed')}
						>
							Processed
						</button>
						<button
							class="filter-chip"
							class:active={filters.status === 'unprocessed'}
							onclick={() => setStatus('unprocessed')}
						>
							Unprocessed
						</button>
					</div>
				</div>

				<!-- Category Filter -->
				<div class="filter-section">
					<h3>Category</h3>
					<div class="filter-chips">
						<button
							class="filter-chip"
							class:active={filters.category === 'all'}
							onclick={() => setCategory('all')}
						>
							All
						</button>
						<button
							class="filter-chip"
							class:active={filters.category === 'todo'}
							onclick={() => setCategory('todo')}
						>
							☑️ Todos
						</button>
						<button
							class="filter-chip"
							class:active={filters.category === 'reading'}
							onclick={() => setCategory('reading')}
						>
							📖 Reading
						</button>
						<button
							class="filter-chip"
							class:active={filters.category === 'watching'}
							onclick={() => setCategory('watching')}
						>
							▶️ Watch
						</button>
						<button
							class="filter-chip"
							class:active={filters.category === 'transcription'}
							onclick={() => setCategory('transcription')}
						>
							📝 Notes
						</button>
					</div>
				</div>

				<!-- Options -->
				<div class="filter-section">
					<h3>Options</h3>
					<label class="checkbox-label">
						<input
							type="checkbox"
							checked={filters.includeArchived}
							onchange={toggleArchived}
						/>
						Include archived items
					</label>
				</div>

				{#if activeFilterCount > 0}
					<button class="clear-filters-btn" onclick={clearAllFilters}>
						Clear All Filters
					</button>
				{/if}
			</div>
		{/if}

		<!-- Results List -->
		<div class="results">
			{#if !query}
				<div class="empty-state" in:fade={{ duration: 300 }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>
					<h2>Search Drainiac</h2>
					<p>Find your todos, notes, reading list, and more</p>
					<p class="tip">💡 Tip: Press <kbd>⌘K</kbd> to quickly access search</p>
				</div>
			{:else if results.length === 0}
				<div class="empty-state" in:fade={{ duration: 300 }}>
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<h2>No results found</h2>
					<p>No items match "{query}"</p>
					<div class="suggestions">
						<p>Try:</p>
						<ul>
							<li>Checking your spelling</li>
							<li>Using different keywords</li>
							<li>Clearing some filters</li>
						</ul>
					</div>
				</div>
			{:else}
				<div class="results-list">
					{#each results as result (result.item.id)}
						<button
							class="result-item"
							onclick={() => navigateToItem(result.item.id, result.item.type)}
							transition:fade={{ duration: 200 }}
						>
							<div class="result-header">
								<span class="type-badge {getItemTypeInfo(result.item.type).color}">
									{getItemTypeInfo(result.item.type).icon}
									{getItemTypeInfo(result.item.type).label}
								</span>
								<span class="result-date">{formatDate(result.item.createdAt)}</span>
							</div>

							<div class="result-title">
								{@html highlightText(result.item.title, query)}
							</div>

							{#if result.item.content}
								<div class="result-content">
									{@html highlightText(result.item.content, query)}
								</div>
							{/if}

							{#if result.item.tags && result.item.tags.length > 0}
								<div class="result-tags">
									{#each result.item.tags as tag}
										<span class="tag">{tag}</span>
									{/each}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>

<style>
	.container {
		min-height: 100vh;
		background: var(--background);
		padding-bottom: var(--spacing-2xl);
	}

	header {
		background: var(--card);
		border-bottom: 1px solid var(--border);
		padding: var(--spacing-lg);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-md);
	}

	h1 {
		font-size: var(--font-size-h1);
		font-weight: 600;
		margin: 0;
	}

	.search-bar-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: center;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--spacing-xl) var(--spacing-lg);
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-lg);
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.results-info {
		color: var(--muted-foreground);
	}

	.filter-controls {
		display: flex;
		gap: var(--spacing-md);
	}

	.filter-toggle {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.filter-toggle:hover {
		background: var(--muted);
	}

	.filter-toggle.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.filter-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 6px;
		background: var(--accent);
		color: white;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
	}

	.clear-search-btn {
		padding: var(--spacing-sm) var(--spacing-md);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.clear-search-btn:hover {
		background: var(--muted);
	}

	.filters {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		margin-bottom: var(--spacing-xl);
	}

	.filter-section {
		margin-bottom: var(--spacing-lg);
	}

	.filter-section:last-of-type {
		margin-bottom: 0;
	}

	.filter-section h3 {
		font-size: var(--font-size-sm);
		font-weight: 600;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin-bottom: var(--spacing-sm);
	}

	.filter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
	}

	.filter-chip {
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.filter-chip:hover {
		background: var(--muted);
	}

	.filter-chip.active {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		cursor: pointer;
	}

	.clear-filters-btn {
		width: 100%;
		padding: var(--spacing-md);
		background: var(--secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
		margin-top: var(--spacing-lg);
	}

	.clear-filters-btn:hover {
		background: var(--muted);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-2xl) var(--spacing-lg);
		text-align: center;
		color: var(--muted-foreground);
	}

	.empty-state svg {
		margin-bottom: var(--spacing-lg);
		opacity: 0.5;
	}

	.empty-state h2 {
		font-size: var(--font-size-h2);
		color: var(--foreground);
		margin-bottom: var(--spacing-sm);
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}

	.tip {
		font-size: var(--font-size-sm);
		color: var(--muted-foreground);
	}

	kbd {
		padding: 2px 6px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: monospace;
		font-size: 12px;
	}

	.suggestions {
		margin-top: var(--spacing-md);
		text-align: left;
	}

	.suggestions ul {
		list-style: disc;
		padding-left: var(--spacing-lg);
		margin-top: var(--spacing-sm);
	}

	.suggestions li {
		margin-bottom: var(--spacing-xs);
	}

	.results-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.result-item {
		width: 100%;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		text-align: left;
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.result-item:hover {
		border-color: var(--primary);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-sm);
	}

	.type-badge {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		border: 1px solid;
	}

	.result-date {
		font-size: var(--font-size-sm);
		color: var(--muted-foreground);
	}

	.result-title {
		font-size: var(--font-size-base);
		font-weight: 500;
		color: var(--foreground);
		margin-bottom: var(--spacing-xs);
	}

	.result-title :global(mark) {
		background: var(--chart-1);
		color: var(--foreground);
		padding: 2px 4px;
		border-radius: 2px;
	}

	.result-content {
		font-size: var(--font-size-sm);
		color: var(--muted-foreground);
		line-height: 1.5;
		margin-bottom: var(--spacing-sm);
	}

	.result-content :global(mark) {
		background: var(--chart-1);
		color: var(--foreground);
		padding: 2px 4px;
		border-radius: 2px;
	}

	.result-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		margin-top: var(--spacing-sm);
	}

	.tag {
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--secondary);
		border-radius: var(--radius-sm);
		font-size: 12px;
		color: var(--muted-foreground);
	}
</style>
