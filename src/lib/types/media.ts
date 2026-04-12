export type ReadingItemType = 'book' | 'article' | 'other';
export type WatchItemType = 'film' | 'series' | 'video' | 'other';
export type MediaStatus = 'queued' | 'in-progress' | 'completed';

export interface ReadingItem {
	id: string;
	title: string;
	type: ReadingItemType;
	status: MediaStatus;
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
	source?: string;
	notes?: string;
	tags?: string[];
	rating?: 1 | 2 | 3 | 4 | 5;
	archived: boolean;
}

export interface WatchItem {
	id: string;
	title: string;
	type: WatchItemType;
	status: MediaStatus;
	createdAt: number;
	startedAt?: number;
	completedAt?: number;
	source?: string;
	notes?: string;
	tags?: string[];
	rating?: 1 | 2 | 3 | 4 | 5;
	archived: boolean;
}

export const STATUS_COLORS: Record<MediaStatus, string> = {
	queued: 'bg-gray-100 text-gray-700',
	'in-progress': 'bg-blue-100 text-blue-700',
	completed: 'bg-green-100 text-green-700'
};

export const READING_TYPE_LABELS: Record<ReadingItemType, string> = {
	book: 'Book',
	article: 'Article',
	other: 'Other'
};

export const WATCH_TYPE_LABELS: Record<WatchItemType, string> = {
	film: 'Film',
	series: 'Series',
	video: 'Video',
	other: 'Other'
};
