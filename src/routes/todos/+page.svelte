<script lang="ts">
	import { createTodoStore } from '$lib/utils/todo-store.svelte';
	import type { TodoStatus, TodoPriority } from '$lib/types/todo';
	import { PRIORITY_COLORS } from '$lib/types/todo';

	const todoStore = createTodoStore();

	let filter = $state<'all' | TodoStatus>('all');
	let editingId = $state<string | null>(null);
	let editText = $state('');
	let deleteConfirmId = $state<string | null>(null);
	let newTodoText = $state('');

	const filteredTodos = $derived(
		filter === 'all' ? todoStore.todos : todoStore.getByStatus(filter as TodoStatus)
	);

	const counts = $derived(todoStore.getCounts());

	function startEdit(id: string, text: string) {
		editingId = id;
		editText = text;
	}

	function saveEdit() {
		if (editingId && editText.trim()) {
			todoStore.update(editingId, { text: editText.trim() });
		}
		editingId = null;
		editText = '';
	}

	function cancelEdit() {
		editingId = null;
		editText = '';
	}

	function confirmDelete(id: string) {
		todoStore.remove(id);
		deleteConfirmId = null;
	}

	function setPriority(id: string, priority: TodoPriority | '') {
		try {
			todoStore.update(id, { priority: priority || undefined });
		} catch (error) {
			console.error('Failed to update priority:', error);
		}
	}

	function formatDate(timestamp?: number) {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		return date.toLocaleDateString();
	}

	function isOverdue(dueDate?: number) {
		if (!dueDate) return false;
		return dueDate < Date.now();
	}

	function addTodo() {
		if (newTodoText.trim()) {
			todoStore.add(newTodoText.trim());
			newTodoText = '';
		}
	}
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<header class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">My Todos</h1>
			<a href="/" class="text-blue-600 hover:text-blue-700">← Back to Capture</a>
		</div>

		<!-- Add Todo Form -->
		<form onsubmit={(e) => { e.preventDefault(); addTodo(); }} class="flex gap-2">
			<input
				type="text"
				bind:value={newTodoText}
				placeholder="Add a new todo..."
				class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!newTodoText.trim()}
			>
				Add
			</button>
		</form>
	</header>

	<!-- Filter Tabs -->
	<div class="mb-6 flex gap-2 border-b border-gray-200">
		<button
			class="px-4 py-2 font-medium transition-colors {filter === 'all'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'all')}
		>
			All ({counts.all})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {filter === 'pending'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'pending')}
		>
			Active ({counts.active})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {filter === 'complete'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'complete')}
		>
			Complete ({counts.complete})
		</button>
	</div>

	<!-- Todo List -->
	{#if filteredTodos.length === 0}
		<div class="rounded-lg bg-gray-50 p-8 text-center">
			<p class="text-gray-600">
				{filter === 'all'
					? 'No todos yet. Say "Todo" followed by your task to add one!'
					: filter === 'pending'
						? 'No active todos!'
						: 'No completed todos!'}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredTodos as todo (todo.id)}
				<div
					class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
				>
					<!-- Checkbox -->
					<input
						type="checkbox"
						checked={todo.status === 'complete'}
						onchange={() => todoStore.toggleComplete(todo.id)}
						class="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
					/>

					<!-- Content -->
					<div class="flex-1">
						{#if editingId === todo.id}
							<input
								type="text"
								bind:value={editText}
								onkeydown={(e) => {
									if (e.key === 'Enter') saveEdit();
									if (e.key === 'Escape') cancelEdit();
								}}
								class="w-full rounded border border-gray-300 px-2 py-1 focus:border-blue-500 focus:outline-none"
								autofocus
							/>
							<div class="mt-2 flex gap-2">
								<button
									onclick={saveEdit}
									class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
								>
									Save
								</button>
								<button
									onclick={cancelEdit}
									class="rounded bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
								>
									Cancel
								</button>
							</div>
						{:else}
							<button
								onclick={() => startEdit(todo.id, todo.text)}
								class="w-full text-left {todo.status === 'complete'
									? 'text-gray-400 line-through'
									: 'text-gray-900'} hover:text-blue-600"
							>
								{todo.text}
							</button>
						{/if}

						<!-- Metadata -->
						<div class="mt-1 flex flex-wrap items-center gap-2 text-sm">
							<!-- Priority -->
							{#if todo.priority}
								<span class="rounded px-2 py-0.5 text-xs font-medium {PRIORITY_COLORS[todo.priority]}">
									{todo.priority}
								</span>
							{/if}

							<!-- Due Date -->
							{#if todo.dueDate}
								<span
									class="text-xs {isOverdue(todo.dueDate) && todo.status === 'pending'
										? 'font-semibold text-red-600'
										: 'text-gray-500'}"
								>
									{isOverdue(todo.dueDate) && todo.status === 'pending' ? '⚠️ ' : ''}Due: {formatDate(
										todo.dueDate
									)}
								</span>
							{/if}

							<!-- Completed At -->
							{#if todo.completedAt}
								<span class="text-xs text-gray-500">
									Completed: {formatDate(todo.completedAt)}
								</span>
							{/if}
						</div>
					</div>

					<!-- Actions -->
					<div class="flex items-center gap-2">
						<!-- Priority Selector -->
						<select
							value={todo.priority || ''}
							onchange={(e) => {
								const val = e.currentTarget.value as TodoPriority | '';
								setPriority(todo.id, val);
							}}
							class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
						>
							<option value="">No priority</option>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>

						<!-- Archive Button -->
						<button
							onclick={() => todoStore.archive(todo.id)}
							class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
							title="Archive"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
								/>
							</svg>
						</button>

						<!-- Delete Button -->
						{#if deleteConfirmId === todo.id}
							<div class="flex gap-1">
								<button
									onclick={() => confirmDelete(todo.id)}
									class="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
								>
									Delete
								</button>
								<button
									onclick={() => (deleteConfirmId = null)}
									class="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
								>
									Cancel
								</button>
							</div>
						{:else}
							<button
								onclick={() => (deleteConfirmId = todo.id)}
								class="rounded p-2 text-red-500 hover:bg-red-50"
								title="Delete"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
