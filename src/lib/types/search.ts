export type SearchableItemType = 'todo' | 'transcription' | 'reading' | 'watching' | 'note' | 'idea';

export interface SearchableItem {
	id: string;
	type: SearchableItemType;
	title: string; // Main text or title
	content?: string; // Additional searchable text (notes, descriptions)
	category?: string; // todo, read, watch, note, etc.
	status?: string; // pending, complete, queued, in-progress, etc.
	tags?: string[]; // Tags for filtering
	createdAt: number; // Unix timestamp
	completedAt?: number; // If applicable
	archived: boolean;
}

export interface SearchFilters {
	category?: SearchableItemType | 'all';
	status?: 'all' | 'processed' | 'unprocessed' | string;
	dateRange?: {
		start: number;
		end: number;
	};
	tags?: string[];
	includeArchived: boolean;
}

export interface SearchResult {
	item: SearchableItem;
	score?: number; // Relevance score (for future ranking)
	matchedFields: string[]; // Which fields matched the query
}
