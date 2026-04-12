export type Category = 'todo' | 'read' | 'watch' | 'note' | 'idea' | 'habit';

export interface Transcription {
	id: string;
	text: string;
	timestamp: number;
	category?: Category;
	rawText?: string;
}

export interface CategoryInfo {
	id: Category;
	label: string;
	color: string;
	icon: string;
}

export const CATEGORY_MAP: Record<string, Category> = {
	todo: 'todo',
	'to do': 'todo', // Speech recognition often transcribes as two words
	read: 'read',
	watch: 'watch',
	note: 'note',
	idea: 'idea',
	id: 'idea', // Speech recognition often transcribes "idea" as "ID"
	habit: 'habit'
};

export const CATEGORIES: CategoryInfo[] = [
	{
		id: 'todo',
		label: 'Todo',
		color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
		icon: '☑️'
	},
	{
		id: 'read',
		label: 'Read',
		color: 'bg-green-500/10 text-green-600 border-green-500/20',
		icon: '📖'
	},
	{
		id: 'watch',
		label: 'Watch',
		color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
		icon: '▶️'
	},
	{
		id: 'note',
		label: 'Note',
		color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
		icon: '📄'
	},
	{
		id: 'idea',
		label: 'Idea',
		color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
		icon: '💡'
	},
	{
		id: 'habit',
		label: 'Habit',
		color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
		icon: '🎯'
	}
];

export function getCategoryInfo(category?: Category): CategoryInfo | null {
	if (!category) return null;
	return CATEGORIES.find((c) => c.id === category) || null;
}
