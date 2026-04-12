export interface UserProgress {
	level: number;
	xp: number;
	currentStreak: number;
	longestStreak: number;
	lastCompletionDate: string; // ISO date string (YYYY-MM-DD)
	todosCompleted: number;
}

export const DEFAULT_USER_PROGRESS: UserProgress = {
	level: 1,
	xp: 0,
	currentStreak: 0,
	longestStreak: 0,
	lastCompletionDate: '',
	todosCompleted: 0
};
