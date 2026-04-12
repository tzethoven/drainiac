export type TodoStatus = 'pending' | 'complete';
export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
	id: string;
	text: string;
	status: TodoStatus;
	createdAt: number;
	completedAt?: number;
	priority?: TodoPriority;
	dueDate?: number;
	archived: boolean;
}

export const PRIORITY_COLORS: Record<TodoPriority, string> = {
	low: 'bg-blue-100 text-blue-700',
	medium: 'bg-yellow-100 text-yellow-700',
	high: 'bg-red-100 text-red-700'
};
