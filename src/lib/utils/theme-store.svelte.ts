import { browser } from '$app/environment';

function getInitialTheme(): 'light' | 'dark' {
	if (!browser) return 'light';

	// Check localStorage first
	const stored = localStorage.getItem('theme');
	if (stored === 'light' || stored === 'dark') return stored;

	// Check system preference
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return 'dark';
	}

	return 'light';
}

function applyTheme(theme: 'light' | 'dark') {
	if (!browser) return;

	if (theme === 'dark') {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}

	localStorage.setItem('theme', theme);
}

export function createThemeStore() {
	const initialTheme = getInitialTheme();
	let theme = $state<'light' | 'dark'>(initialTheme);

	// Apply theme on initialization
	if (browser) {
		applyTheme(initialTheme);
	}

	function toggle() {
		theme = theme === 'light' ? 'dark' : 'light';
		applyTheme(theme);
	}

	function setTheme(newTheme: 'light' | 'dark') {
		theme = newTheme;
		applyTheme(theme);
	}

	return {
		get theme() {
			return theme;
		},
		toggle,
		setTheme
	};
}
