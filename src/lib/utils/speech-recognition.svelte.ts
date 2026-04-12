// Type definitions for Web Speech API (not included in TypeScript by default)
interface SpeechRecognitionResult {
	readonly isFinal: boolean;
	readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
	readonly transcript: string;
	readonly confidence: number;
}

interface SpeechRecognitionResultList {
	readonly length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
	readonly results: SpeechRecognitionResultList;
	readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
	readonly error: string;
	readonly message: string;
}

interface SpeechRecognitionInterface extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

declare global {
	interface Window {
		SpeechRecognition: new () => SpeechRecognitionInterface;
		webkitSpeechRecognition: new () => SpeechRecognitionInterface;
	}
}

const SpeechRecognition =
	typeof window !== 'undefined'
		? window.SpeechRecognition || window.webkitSpeechRecognition
		: undefined;

export function createSpeechRecognition() {
	let isRecording = $state(false);
	let interimText = $state('');
	let finalText = $state('');
	let isSupported = $state(!!SpeechRecognition);
	let error = $state<string | null>(null);

	let recognition: SpeechRecognitionInterface | null = null;
	let endResolve: ((text: string) => void) | null = null;

	function start() {
		if (!SpeechRecognition) {
			error = 'Speech recognition is not supported in this browser.';
			return;
		}

		const newRecognition = new SpeechRecognition();
		newRecognition.continuous = true;
		newRecognition.interimResults = true;
		newRecognition.lang = 'en-US';

		finalText = '';
		interimText = '';
		error = null;

		newRecognition.onresult = (event: SpeechRecognitionEvent) => {
			let interim = '';
			let final = '';

			for (let i = 0; i < event.results.length; i++) {
				const result = event.results[i];
				if (result.isFinal) {
					final += result[0].transcript;
				} else {
					interim += result[0].transcript;
				}
			}

			finalText = final;
			interimText = interim;
		};

		newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error !== 'aborted') {
				error = `Speech recognition error: ${event.error}`;
			}
			isRecording = false;
		};

		newRecognition.onend = () => {
			isRecording = false;
			const text = (finalText + (interimText ? ' ' + interimText : '')).trim();
			interimText = '';
			if (endResolve) {
				endResolve(text);
				endResolve = null;
			}
			recognition = null;
		};

		newRecognition.start();
		isRecording = true;
		recognition = newRecognition;
	}

	function stop(): Promise<string> {
		return new Promise((resolve) => {
			if (!recognition) {
				resolve('');
				return;
			}
			endResolve = resolve;
			recognition.stop();
		});
	}

	return {
		get isRecording() {
			return isRecording;
		},
		get interimText() {
			return interimText;
		},
		get finalText() {
			return finalText;
		},
		get fullText() {
			return (finalText + (interimText ? ' ' + interimText : '')).trim();
		},
		get isSupported() {
			return isSupported;
		},
		get error() {
			return error;
		},
		start,
		stop
	};
}
