import type { Todo, TodoStatus, TodoPriority } from '$lib/types/todo';
import { createLocalStorage } from './local-storage';

const storage = createLocalStorage<Todo>('drainiac-todos');

export function createTodoStore() {
	let todos = $state<Todo[]>(storage.load());

	function add(text: string, priority?: TodoPriority, dueDate?: number) {
		const todo: Todo = {
			id: crypto.randomUUID(),
			text: text.trim(),
			status: 'pending',
			createdAt: Date.now(),
			priority,
			dueDate,
			archived: false
		};

		todos = [todo, ...todos];
		storage.save(todos);
		return todo;
	}

	function update(id: string, updates: Partial<Todo>) {
		todos = todos.map((t) => (t.id === id ? { ...t, ...updates } : t));
		storage.save(todos);
	}

	function toggleComplete(id: string) {
		todos = todos.map((t) => {
			if (t.id === id) {
				const newStatus: TodoStatus = t.status === 'pending' ? 'complete' : 'pending';
				return {
					...t,
					status: newStatus,
					completedAt: newStatus === 'complete' ? Date.now() : undefined
				};
			}
			return t;
		});
		storage.save(todos);
	}

	function remove(id: string) {
		todos = todos.filter((t) => t.id !== id);
		storage.save(todos);
	}

	function archive(id: string) {
		update(id, { archived: true });
	}

	function getActive(): Todo[] {
		return todos.filter((t) => !t.archived);
	}

	function getByStatus(status?: TodoStatus): Todo[] {
		const active = getActive();
		if (!status) return active;
		return active.filter((t) => t.status === status);
	}

	function getCounts(): { all: number; active: number; complete: number } {
		const active = getActive();
		return {
			all: active.length,
			active: active.filter((t) => t.status === 'pending').length,
			complete: active.filter((t) => t.status === 'complete').length
		};
	}

	return {
		get todos() {
			return getActive();
		},
		add,
		update,
		toggleComplete,
		remove,
		archive,
		getByStatus,
		getCounts
	};
}
