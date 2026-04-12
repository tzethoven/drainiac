import type { Transcription, Category } from '$lib/types/transcription';
import { CATEGORY_MAP } from '$lib/types/transcription';

const STORAGE_KEY = 'drainiac-transcriptions';

function loadFromStorage(): Transcription[] {
	if (typeof window === 'undefined') return [];
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch {
		return [];
	}
}

function saveToStorage(transcriptions: Transcription[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(transcriptions));
}

function detectCategory(text: string): { category?: Category; cleanedText: string; rawText: string } {
	const trimmed = text.trim();
	const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();

	const category = CATEGORY_MAP[firstWord];

	if (category) {
		// Remove code word from text
		const cleanedText = trimmed.slice(firstWord.length).trim();
		return { category, cleanedText, rawText: trimmed };
	}

	return { cleanedText: trimmed, rawText: trimmed };
}

export function createTranscriptionStore() {
	let transcriptions = $state<Transcription[]>(loadFromStorage());

	function add(text: string) {
		const { category, cleanedText, rawText } = detectCategory(text);

		// Don't save if text is empty after removing code word
		if (!cleanedText) return;

		const entry: Transcription = {
			id: crypto.randomUUID(),
			text: cleanedText,
			timestamp: Date.now(),
			category,
			rawText: category ? rawText : undefined
		};

		transcriptions = [entry, ...transcriptions];
		saveToStorage(transcriptions);
	}

	function remove(id: string) {
		transcriptions = transcriptions.filter((t) => t.id !== id);
		saveToStorage(transcriptions);
	}

	function getByCategory(category?: Category): Transcription[] {
		if (!category) return transcriptions;
		return transcriptions.filter((t) => t.category === category);
	}

	function getCategoryCounts(): Record<Category | 'all', number> {
		const counts: Record<string, number> = {
			all: transcriptions.length
		};

		for (const t of transcriptions) {
			if (t.category) {
				counts[t.category] = (counts[t.category] || 0) + 1;
			}
		}

		return counts as Record<Category | 'all', number>;
	}

	return {
		get transcriptions() {
			return transcriptions;
		},
		add,
		remove,
		getByCategory,
		getCategoryCounts
	};
}
