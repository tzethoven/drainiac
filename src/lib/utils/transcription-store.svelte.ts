export interface Transcription {
	id: string;
	text: string;
	timestamp: number;
}

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

export function createTranscriptionStore() {
	let transcriptions = $state<Transcription[]>(loadFromStorage());

	function add(text: string) {
		const trimmed = text.trim();
		if (!trimmed) return;

		const entry: Transcription = {
			id: crypto.randomUUID(),
			text: trimmed,
			timestamp: Date.now()
		};

		transcriptions = [entry, ...transcriptions];
		saveToStorage(transcriptions);
	}

	function remove(id: string) {
		transcriptions = transcriptions.filter((t) => t.id !== id);
		saveToStorage(transcriptions);
	}

	return {
		get transcriptions() { return transcriptions; },
		add,
		remove
	};
}
