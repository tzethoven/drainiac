import type { Transcription } from '$lib/types/transcription';
import { createLocalStorage } from './local-storage';

export type MediaStatus = 'queued' | 'in-progress' | 'completed';

interface BaseMediaItem {
	id: string;
	title: string;
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

interface MediaStoreConfig<T extends BaseMediaItem> {
	storageKey: string;
	migrationFlag: string;
	transcriptionCategory: 'read' | 'watch';
	calculateXP: (item: T) => number;
	defaultType: T['type'] extends string ? T['type'] : never;
}

export function createMediaStore<T extends BaseMediaItem>(config: MediaStoreConfig<T>) {
	const storage = createLocalStorage<T>(config.storageKey);
	const TRANSCRIPTIONS_KEY = 'drainiac-transcriptions';

	function migrateFromTranscriptions(): T[] {
		if (typeof window === 'undefined') return [];

		// Check if migration already done
		if (localStorage.getItem(config.migrationFlag)) return [];

		try {
			const transcriptionsData = localStorage.getItem(TRANSCRIPTIONS_KEY);
			if (!transcriptionsData) {
				localStorage.setItem(config.migrationFlag, 'true');
				return [];
			}

			const transcriptions: Transcription[] = JSON.parse(transcriptionsData);
			const filteredTranscriptions = transcriptions.filter(
				(t) => t.category === config.transcriptionCategory
			);

			// Convert transcriptions to media items
			const migratedItems: T[] = filteredTranscriptions.map((t) => ({
				id: t.id,
				title: t.text,
				type: config.defaultType,
				status: 'queued',
				createdAt: t.timestamp,
				archived: false
			})) as T[];

			// Set migration flag
			localStorage.setItem(config.migrationFlag, 'true');

			return migratedItems;
		} catch {
			localStorage.setItem(config.migrationFlag, 'true');
			return [];
		}
	}

	function loadInitialItems(): T[] {
		const stored = storage.load();
		if (typeof window !== 'undefined' && stored.length === 0) {
			const migrated = migrateFromTranscriptions();
			if (migrated.length > 0) {
				storage.save(migrated);
				return migrated;
			}
		}
		return stored;
	}

	let items = $state<T[]>(loadInitialItems());

	function add(title: string, type?: T['type'], source?: string): T {
		const item: T = {
			id: crypto.randomUUID(),
			title: title.trim(),
			type: type || config.defaultType,
			status: 'queued',
			createdAt: Date.now(),
			source,
			archived: false
		} as T;

		items = [item, ...items];
		storage.save(items);
		return item;
	}

	function update(id: string, updates: Partial<T>) {
		items = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
		storage.save(items);
	}

	function markInProgress(id: string) {
		update(id, {
			status: 'in-progress',
			startedAt: Date.now()
		} as Partial<T>);
	}

	function markComplete(id: string, rating?: 1 | 2 | 3 | 4 | 5) {
		update(id, {
			status: 'completed',
			completedAt: Date.now(),
			rating
		} as Partial<T>);
	}

	function remove(id: string) {
		items = items.filter((item) => item.id !== id);
		storage.save(items);
	}

	function archive(id: string) {
		update(id, { archived: true } as Partial<T>);
	}

	function getActive(): T[] {
		return items.filter((item) => !item.archived);
	}

	function getByStatus(status?: MediaStatus): T[] {
		const active = getActive();
		if (!status) return active;
		return active.filter((item) => item.status === status);
	}

	function getRandomQueued(count: number): T[] {
		const queued = getByStatus('queued');
		if (queued.length <= count) return queued;

		// Shuffle and take first N items
		const shuffled = [...queued].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	}

	function getCounts(): { all: number; queued: number; inProgress: number; completed: number } {
		const active = getActive();
		return {
			all: active.length,
			queued: active.filter((item) => item.status === 'queued').length,
			inProgress: active.filter((item) => item.status === 'in-progress').length,
			completed: active.filter((item) => item.status === 'completed').length
		};
	}

	return {
		get items() {
			return getActive();
		},
		add,
		update,
		markInProgress,
		markComplete,
		remove,
		archive,
		getByStatus,
		getRandomQueued,
		getCounts,
		calculateXP: config.calculateXP
	};
}
