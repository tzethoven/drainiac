import type { SearchableItem, SearchFilters, SearchResult, SearchableItemType } from '$lib/types/search';
import type { Transcription } from '$lib/types/transcription';
import type { Todo } from '$lib/types/todo';
import type { ReadingItem, WatchItem } from '$lib/types/media';

export function createSearchStore() {
	let query = $state('');
	let filters = $state<SearchFilters>({
		category: 'all',
		status: 'all',
		includeArchived: false
	});
	let results = $state<SearchResult[]>([]);

	// Build search index from all data sources
	function buildIndex(
		transcriptions: Transcription[],
		todos: Todo[],
		readingItems: ReadingItem[],
		watchItems: WatchItem[]
	): SearchableItem[] {
		const index: SearchableItem[] = [];

		// Index transcriptions
		for (const t of transcriptions) {
			index.push({
				id: t.id,
				type: 'transcription',
				title: t.text,
				category: t.category,
				status: t.category ? 'processed' : 'unprocessed',
				createdAt: t.timestamp,
				archived: false // Transcriptions don't have archive flag
			});
		}

		// Index todos
		for (const todo of todos) {
			const isProcessed = todo.status === 'complete' || todo.archived;
			index.push({
				id: todo.id,
				type: 'todo',
				title: todo.text,
				category: 'todo',
				status: todo.status,
				createdAt: todo.createdAt,
				completedAt: todo.completedAt,
				archived: todo.archived
			});
		}

		// Index reading items
		for (const item of readingItems) {
			const isProcessed = item.status !== 'queued' || item.archived;
			index.push({
				id: item.id,
				type: 'reading',
				title: item.title,
				content: [item.source, item.notes].filter(Boolean).join(' '),
				category: 'read',
				status: item.status,
				tags: item.tags,
				createdAt: item.createdAt,
				completedAt: item.completedAt,
				archived: item.archived
			});
		}

		// Index watch items
		for (const item of watchItems) {
			const isProcessed = item.status !== 'queued' || item.archived;
			index.push({
				id: item.id,
				type: 'watching',
				title: item.title,
				content: [item.source, item.notes].filter(Boolean).join(' '),
				category: 'watch',
				status: item.status,
				tags: item.tags,
				createdAt: item.createdAt,
				completedAt: item.completedAt,
				archived: item.archived
			});
		}

		return index;
	}

	// Simple keyword matching (case-insensitive, partial words, AND logic for multiple keywords)
	function matchesQuery(item: SearchableItem, searchQuery: string): { matches: boolean; fields: string[] } {
		if (!searchQuery.trim()) return { matches: true, fields: [] };

		const keywords = searchQuery.toLowerCase().trim().split(/\s+/);
		const searchableText = [
			item.title,
			item.content,
			item.category,
			item.status,
			...(item.tags || [])
		]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();

		const matchedFields: string[] = [];

		// All keywords must match (AND logic)
		const allMatch = keywords.every((keyword) => {
			if (searchableText.includes(keyword)) {
				// Track which fields matched
				if (item.title.toLowerCase().includes(keyword)) matchedFields.push('title');
				if (item.content?.toLowerCase().includes(keyword)) matchedFields.push('content');
				if (item.category?.toLowerCase().includes(keyword)) matchedFields.push('category');
				if (item.tags?.some((t) => t.toLowerCase().includes(keyword))) matchedFields.push('tags');
				return true;
			}
			return false;
		});

		return { matches: allMatch, fields: [...new Set(matchedFields)] };
	}

	// Check if item is processed based on type and status
	function isProcessed(item: SearchableItem): boolean {
		if (item.archived) return true;

		switch (item.type) {
			case 'todo':
				return item.status === 'complete';
			case 'reading':
			case 'watching':
				return item.status === 'in-progress' || item.status === 'completed';
			case 'transcription':
				return !!item.category; // Has been categorized
			default:
				return false;
		}
	}

	// Apply filters to search results
	function applyFilters(items: SearchableItem[]): SearchableItem[] {
		let filtered = items;

		// Category filter
		if (filters.category && filters.category !== 'all') {
			filtered = filtered.filter((item) => item.type === filters.category);
		}

		// Status filter (processed/unprocessed or specific status)
		if (filters.status && filters.status !== 'all') {
			if (filters.status === 'processed') {
				filtered = filtered.filter((item) => isProcessed(item));
			} else if (filters.status === 'unprocessed') {
				filtered = filtered.filter((item) => !isProcessed(item));
			} else {
				filtered = filtered.filter((item) => item.status === filters.status);
			}
		}

		// Archived filter
		if (!filters.includeArchived) {
			filtered = filtered.filter((item) => !item.archived);
		}

		// Date range filter
		if (filters.dateRange) {
			filtered = filtered.filter(
				(item) =>
					item.createdAt >= filters.dateRange!.start && item.createdAt <= filters.dateRange!.end
			);
		}

		// Tags filter (item must have ALL selected tags)
		if (filters.tags && filters.tags.length > 0) {
			filtered = filtered.filter((item) =>
				filters.tags!.every((tag) => item.tags?.includes(tag))
			);
		}

		return filtered;
	}

	// Perform search
	function search(
		searchQuery: string,
		index: SearchableItem[]
	): SearchResult[] {
		// Match query
		const matched = index
			.map((item) => {
				const { matches, fields } = matchesQuery(item, searchQuery);
				if (!matches) return null;
				return {
					item,
					matchedFields: fields
				};
			})
			.filter((result): result is SearchResult => result !== null);

		// Apply filters
		const filtered = applyFilters(matched.map((r) => r.item));

		// Rebuild results with matched fields
		const finalResults = filtered.map((item) => {
			const original = matched.find((m) => m.item.id === item.id);
			return {
				item,
				matchedFields: original?.matchedFields || []
			};
		});

		// Sort by creation date (newest first)
		finalResults.sort((a, b) => b.item.createdAt - a.item.createdAt);

		return finalResults;
	}

	// Update query and trigger search
	function setQuery(newQuery: string, index: SearchableItem[]) {
		query = newQuery;
		results = search(query, index);
	}

	// Update filters and re-search
	function setFilters(newFilters: Partial<SearchFilters>, index: SearchableItem[]) {
		filters = { ...filters, ...newFilters };
		results = search(query, index);
	}

	// Clear filters
	function clearFilters(index: SearchableItem[]) {
		filters = {
			category: 'all',
			status: 'all',
			includeArchived: false
		};
		results = search(query, index);
	}

	return {
		get query() {
			return query;
		},
		get filters() {
			return filters;
		},
		get results() {
			return results;
		},
		buildIndex,
		search,
		setQuery,
		setFilters,
		clearFilters
	};
}
