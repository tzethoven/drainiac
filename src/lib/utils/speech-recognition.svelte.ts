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

	let recognition: SpeechRecognition | null = null;
	let endResolve: ((text: string) => void) | null = null;

	function start() {
		if (!SpeechRecognition) {
			error = 'Speech recognition is not supported in this browser.';
			return;
		}

		recognition = new SpeechRecognition();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = 'en-US';

		finalText = '';
		interimText = '';
		error = null;

		recognition.onresult = (event: SpeechRecognitionEvent) => {
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

		recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
			if (event.error !== 'aborted') {
				error = `Speech recognition error: ${event.error}`;
			}
			isRecording = false;
		};

		recognition.onend = () => {
			isRecording = false;
			const text = (finalText + (interimText ? ' ' + interimText : '')).trim();
			interimText = '';
			if (endResolve) {
				endResolve(text);
				endResolve = null;
			}
			recognition = null;
		};

		recognition.start();
		isRecording = true;
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
		get isRecording() { return isRecording; },
		get interimText() { return interimText; },
		get finalText() { return finalText; },
		get fullText() { return (finalText + (interimText ? ' ' + interimText : '')).trim(); },
		get isSupported() { return isSupported; },
		get error() { return error; },
		start,
		stop
	};
}
