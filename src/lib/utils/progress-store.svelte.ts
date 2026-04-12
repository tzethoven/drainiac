import type { UserProgress } from '$lib/types/progress';
import { DEFAULT_USER_PROGRESS } from '$lib/types/progress';
import type { TodoPriority } from '$lib/types/todo';
import { XP_VALUES } from '$lib/constants/xp';

const STORAGE_KEY = 'drainiac-user-progress';

function loadFromStorage(): UserProgress {
	if (typeof window === 'undefined') return DEFAULT_USER_PROGRESS;
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : DEFAULT_USER_PROGRESS;
	} catch {
		return DEFAULT_USER_PROGRESS;
	}
}

function saveToStorage(progress: UserProgress) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
	} catch (error) {
		console.error('Failed to save user progress:', error);
	}
}

function getTodayDateString(): string {
	const now = new Date();
	return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDateString(date: Date): string {
	return date.toISOString().split('T')[0];
}

function calculateLevel(xp: number): number {
	return Math.floor(Math.sqrt(xp / 100)) + 1;
}

function calculateXPToNextLevel(currentLevel: number, currentXP: number): number {
	const nextLevelXP = currentLevel * currentLevel * 100;
	return nextLevelXP - currentXP;
}

function calculateTodoXP(priority: TodoPriority | undefined, currentStreak: number): number {
	let xp = XP_VALUES.TODO_BASE;

	// Apply priority multiplier
	if (priority === 'low') xp *= XP_VALUES.TODO_LOW_MULTIPLIER;
	else if (priority === 'medium') xp *= XP_VALUES.TODO_MEDIUM_MULTIPLIER;
	else if (priority === 'high') xp *= XP_VALUES.TODO_HIGH_MULTIPLIER;

	// Apply streak bonus if streak >= 3 days
	if (currentStreak >= 3) {
		xp += XP_VALUES.TODO_STREAK_BONUS;
	}

	return Math.floor(xp);
}

function updateStreak(lastCompletionDate: string, currentStreak: number): number {
	if (!lastCompletionDate) return 1; // First completion ever

	const today = getTodayDateString();
	if (lastCompletionDate === today) {
		// Already completed today, maintain streak
		return currentStreak;
	}

	const lastDate = new Date(lastCompletionDate);
	const todayDate = new Date(today);

	// Check if completion is within grace period (3 hours after midnight)
	const now = new Date();
	const hoursSinceMidnight = now.getHours() + now.getMinutes() / 60;
	
	if (hoursSinceMidnight <= 3) {
		// Within grace period - check if last completion was yesterday
		const yesterday = new Date(todayDate);
		yesterday.setDate(yesterday.getDate() - 1);
		
		if (getDateString(lastDate) === getDateString(yesterday)) {
			// Maintain streak
			return currentStreak;
		}
	}

	// Check if last completion was yesterday
	const yesterday = new Date(todayDate);
	yesterday.setDate(yesterday.getDate() - 1);

	if (getDateString(lastDate) === getDateString(yesterday)) {
		// Extend streak
		return currentStreak + 1;
	}

	// Streak broken - start fresh
	return 1;
}

export function createProgressStore() {
	let progress = $state<UserProgress>(loadFromStorage());

	function awardTodoXP(priority: TodoPriority | undefined): { 
		xp: number; 
		levelUp: boolean; 
		newLevel: number;
		newStreak: number;
		streakExtended: boolean;
	} {
		const oldLevel = progress.level;
		const xpEarned = calculateTodoXP(priority, progress.currentStreak);
		
		// Update streak
		const newStreak = updateStreak(progress.lastCompletionDate, progress.currentStreak);
		const streakExtended = newStreak > progress.currentStreak;

		// Update progress
		progress = {
			...progress,
			xp: progress.xp + xpEarned,
			currentStreak: newStreak,
			longestStreak: Math.max(progress.longestStreak, newStreak),
			lastCompletionDate: getTodayDateString(),
			todosCompleted: progress.todosCompleted + 1
		};

		// Calculate new level
		const newLevel = calculateLevel(progress.xp);
		const levelUp = newLevel > oldLevel;
		progress.level = newLevel;

		saveToStorage(progress);

		return {
			xp: xpEarned,
			levelUp,
			newLevel,
			newStreak,
			streakExtended
		};
	}

	function getXPProgress(): { current: number; total: number; percentage: number } {
		const currentLevelXP = (progress.level - 1) * (progress.level - 1) * 100;
		const nextLevelXP = progress.level * progress.level * 100;
		const currentInLevel = progress.xp - currentLevelXP;
		const totalForLevel = nextLevelXP - currentLevelXP;
		const percentage = (currentInLevel / totalForLevel) * 100;

		return {
			current: currentInLevel,
			total: totalForLevel,
			percentage
		};
	}

	return {
		get progress() {
			return progress;
		},
		awardTodoXP,
		getXPProgress,
		get xpToNextLevel() {
			return calculateXPToNextLevel(progress.level, progress.xp);
		}
	};
}
