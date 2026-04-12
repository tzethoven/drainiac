export const XP_VALUES = {
	// Reading XP
	BOOK: 50,
	ARTICLE: 10,
	// Watch XP
	FILM: 30,
	SERIES: 10,
	VIDEO: 10,
	// Todo XP
	TODO_BASE: 10,
	TODO_LOW_MULTIPLIER: 1,
	TODO_MEDIUM_MULTIPLIER: 1.5,
	TODO_HIGH_MULTIPLIER: 2,
	TODO_STREAK_BONUS: 5, // Applied when streak >= 3 days
	// Bonuses
	BONUS_24HR: 5,
	BONUS_PICKER: 10
} as const;
