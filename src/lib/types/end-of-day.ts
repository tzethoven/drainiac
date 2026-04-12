import type { Category } from './transcription';
import type { Todo } from './todo';
import type { ReadingItem, WatchItem } from './media';
import type { Transcription } from './transcription';

export interface EndOfDaySession {
	id: string;
	date: string; // ISO date (YYYY-MM-DD)
	itemsProcessed: number;
	todosCompleted: number;
	reflectionNote?: string;
	completedAt: number; // Unix timestamp
}

export type ProcessableItemType =
	| 'uncategorized-transcription'
	| 'completed-todo'
	| 'reading-item'
	| 'watch-item';

// Unified item for processing queue
export interface ProcessableItem {
	id: string;
	type: ProcessableItemType;
	category?: Category;
	data: Transcription | Todo | ReadingItem | WatchItem;
	timestamp: number; // For sorting
}

// Actions available for each item type
export type ProcessAction =
	| 'assign-category'
	| 'delete'
	| 'keep-as-note'
	| 'skip'
	| 'archive'
	| 'keep-active'
	| 'set-priority'
	| 'mark-as-next'
	| 'add-tags'
	| 'promote-to-todo';

export interface ActionResult {
	action: ProcessAction;
	itemId: string;
	newCategory?: Category;
	processed: boolean; // true if item should be removed from queue
}
