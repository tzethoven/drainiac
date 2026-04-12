import type { Transcription, Category } from '$lib/types/transcription';
import { CATEGORY_MAP } from '$lib/types/transcription';
import { createLocalStorage } from './local-storage';

const storage = createLocalStorage<Transcription>('drainiac-transcriptions');

function detectCategory(text: string): { category?: Category; cleanedText: string; rawText: string } {
	const trimmed = text.trim();
	const lowerText = trimmed.toLowerCase();

	// Check for specific multi-word code words ("to do" only for now)
	if (lowerText.startsWith('to do ') || lowerText === 'to do') {
		const cleanedText = trimmed.slice(5).trim(); // "to do".length = 5
		return { category: 'todo', cleanedText, rawText: trimmed };
	}

	// Check single-word code words
	const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
	const category = CATEGORY_MAP[firstWord];

	if (category) {
		const cleanedText = trimmed.slice(firstWord.length).trim();
		return { category, cleanedText, rawText: trimmed };
	}

	return { cleanedText: trimmed, rawText: trimmed };
}

export function createTranscriptionStore() {
	let transcriptions = $state<Transcription[]>(storage.load());

	function add(text: string) {
		const { category, cleanedText, rawText } = detectCategory(text);

		// Don't save if text is empty after removing code word
		if (!cleanedText) return null;

		const entry: Transcription = {
			id: crypto.randomUUID(),
			text: cleanedText,
			timestamp: Date.now(),
			category,
			rawText: category ? rawText : undefined
		};

		transcriptions = [entry, ...transcriptions];
		storage.save(transcriptions);
		return { category, text: cleanedText };
	}

	function remove(id: string) {
		transcriptions = transcriptions.filter((t) => t.id !== id);
		storage.save(transcriptions);
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
