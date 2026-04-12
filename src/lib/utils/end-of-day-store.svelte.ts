import type { EndOfDaySession, ProcessableItem, ProcessAction, ActionResult } from '$lib/types/end-of-day';
import type { Category } from '$lib/types/transcription';
import type { Transcription } from '$lib/types/transcription';
import type { Todo } from '$lib/types/todo';
import type { ReadingItem, WatchItem } from '$lib/types/media';
import type { UserProgress } from '$lib/types/progress';
import { createLocalStorage } from './local-storage';

const STORAGE_KEY = 'drainiac-eod-sessions';
const BONUS_XP = 50;

function getTodayDateString(): string {
	const now = new Date();
	return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function createEndOfDayStore() {
	const storage = createLocalStorage<EndOfDaySession>(STORAGE_KEY);
	let sessions = $state<EndOfDaySession[]>(storage.load());
	let currentQueue = $state<ProcessableItem[]>([]);
	let currentIndex = $state<number>(0);
	let inProgress = $state<boolean>(false);

	// Build queue from all unprocessed items
	function buildQueue(
		transcriptions: Transcription[],
		todos: Todo[],
		readingItems: ReadingItem[],
		watchItems: WatchItem[]
	): ProcessableItem[] {
		const queue: ProcessableItem[] = [];

		// 1. Uncategorized transcriptions (no category assigned)
		const uncategorized = transcriptions.filter((t) => !t.category);
		for (const t of uncategorized) {
			queue.push({
				id: t.id,
				type: 'uncategorized-transcription',
				data: t,
				timestamp: t.timestamp
			});
		}

		// 2. Completed todos from today (for review/archive)
		const today = getTodayDateString();
		const completedToday = todos.filter((todo) => {
			if (todo.status !== 'complete' || !todo.completedAt) return false;
			const completedDate = new Date(todo.completedAt).toISOString().split('T')[0];
			return completedDate === today;
		});
		for (const todo of completedToday) {
			queue.push({
				id: todo.id,
				type: 'completed-todo',
				data: todo,
				timestamp: todo.completedAt || todo.createdAt
			});
		}

		// 3. New read items (created today, still queued)
		const newReading = readingItems.filter((item) => {
			if (item.status !== 'queued') return false;
			const createdDate = new Date(item.createdAt).toISOString().split('T')[0];
			return createdDate === today;
		});
		for (const item of newReading) {
			queue.push({
				id: item.id,
				type: 'reading-item',
				data: item,
				timestamp: item.createdAt
			});
		}

		// 4. New watch items (created today, still queued)
		const newWatching = watchItems.filter((item) => {
			if (item.status !== 'queued') return false;
			const createdDate = new Date(item.createdAt).toISOString().split('T')[0];
			return createdDate === today;
		});
		for (const item of newWatching) {
			queue.push({
				id: item.id,
				type: 'watch-item',
				data: item,
				timestamp: item.createdAt
			});
		}

		// Sort by timestamp (oldest first)
		queue.sort((a, b) => a.timestamp - b.timestamp);

		return queue;
	}

	function startProcessing(queue: ProcessableItem[]) {
		currentQueue = queue;
		currentIndex = 0;
		inProgress = true;
	}

	function getCurrentItem(): ProcessableItem | null {
		if (!inProgress || currentIndex >= currentQueue.length) return null;
		return currentQueue[currentIndex];
	}

	function processNextItem() {
		if (currentIndex < currentQueue.length - 1) {
			currentIndex++;
		} else {
			// Queue complete
			inProgress = false;
		}
	}

	function skipCurrentItem() {
		processNextItem();
	}

	function getProgress(): { current: number; total: number; percentage: number } {
		if (currentQueue.length === 0) {
			return { current: 0, total: 0, percentage: 0 };
		}
		return {
			current: currentIndex + 1,
			total: currentQueue.length,
			percentage: ((currentIndex + 1) / currentQueue.length) * 100
		};
	}

	// Check if end-of-day ritual was completed today
	function wasCompletedToday(): boolean {
		const today = getTodayDateString();
		return sessions.some((s) => s.date === today);
	}

	// Define interface for progress store to avoid 'any'
	interface ProgressStore {
		progress: UserProgress;
		awardXP: (amount: number) => { xp: number; levelUp: boolean; newLevel: number };
	}

	// Complete the end-of-day ritual and award bonus XP
	function completeRitual(
		itemsProcessed: number,
		todosCompleted: number,
		reflectionNote: string | undefined,
		progressStore: ProgressStore
	): { bonusXP: number; levelUp: boolean; newLevel: number } {
		const today = getTodayDateString();

		// Don't award bonus if already completed today
		if (wasCompletedToday()) {
			return { bonusXP: 0, levelUp: false, newLevel: progressStore.progress.level };
		}

		// Create session record
		const session: EndOfDaySession = {
			id: crypto.randomUUID(),
			date: today,
			itemsProcessed,
			todosCompleted,
			reflectionNote,
			completedAt: Date.now()
		};

		sessions = [session, ...sessions];
		storage.save(sessions);

		// Award bonus XP
		const result = progressStore.awardXP(BONUS_XP);

		inProgress = false;
		currentQueue = [];
		currentIndex = 0;

		return {
			bonusXP: BONUS_XP,
			levelUp: result.levelUp,
			newLevel: result.newLevel
		};
	}

	// Check if it's after 8 PM
	function shouldShowPrompt(queueLength: number): boolean {
		if (queueLength === 0) return false;
		if (wasCompletedToday()) return false;

		const now = new Date();
		const hour = now.getHours();
		return hour >= 20; // 8 PM or later
	}

	return {
		get sessions() {
			return sessions;
		},
		get currentQueue() {
			return currentQueue;
		},
		get currentItem() {
			return getCurrentItem();
		},
		get inProgress() {
			return inProgress;
		},
		buildQueue,
		startProcessing,
		processNextItem,
		skipCurrentItem,
		getProgress,
		completeRitual,
		wasCompletedToday,
		shouldShowPrompt
	};
}
