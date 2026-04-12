export function createLocalStorage<T>(key: string) {
	function load(): T[] {
		if (typeof window === 'undefined') return [];
		try {
			const data = localStorage.getItem(key);
			return data ? JSON.parse(data) : [];
		} catch {
			return [];
		}
	}

	function save(items: T[]) {
		try {
			localStorage.setItem(key, JSON.stringify(items));
		} catch (error) {
			console.error(`Failed to save to localStorage (${key}):`, error);
		}
	}

	return { load, save };
}
