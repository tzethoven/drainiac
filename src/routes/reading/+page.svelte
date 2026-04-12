<script lang="ts">
	import { createReadingStore } from '$lib/utils/reading-store.svelte';
	import type { MediaStatus, ReadingItemType, ReadingItem } from '$lib/types/media';
	import { STATUS_COLORS, READING_TYPE_LABELS } from '$lib/types/media';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import MediaEditModal from '$lib/components/MediaEditModal.svelte';
	import { fade, slide, scale } from 'svelte/transition';

	const store = createReadingStore();

	let filter = $state<'all' | MediaStatus>('all');
	let editingId = $state<string | null>(null);
	let editTitle = $state('');
	let deleteConfirmId = $state<string | null>(null);
	let newItemTitle = $state('');
	let showPicker = $state(false);
	let completingId = $state<string | null>(null);
	let rating = $state<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
	let editingMetadataItem = $state<ReadingItem | null>(null);

	const filteredItems = $derived(
		filter === 'all' ? store.items : store.getByStatus(filter as MediaStatus)
	);

	const counts = $derived(store.getCounts());
	const pickerItems = $derived(store.getRandomQueued(3));

	function startEdit(id: string, title: string) {
		editingId = id;
		editTitle = title;
	}

	function saveEdit() {
		if (editingId && editTitle.trim()) {
			store.update(editingId, { title: editTitle.trim() });
		}
		editingId = null;
		editTitle = '';
	}

	function cancelEdit() {
		editingId = null;
		editTitle = '';
	}

	function confirmDelete(id: string) {
		store.remove(id);
		deleteConfirmId = null;
	}

	function setType(id: string, type: ReadingItemType | '') {
		try {
			store.update(id, { type: (type || 'other') as ReadingItemType });
		} catch (error) {
			console.error('Failed to update type:', error);
		}
	}

	function addItem() {
		if (newItemTitle.trim()) {
			store.add(newItemTitle.trim());
			newItemTitle = '';
		}
	}

	function openPicker() {
		showPicker = true;
	}

	function closePicker() {
		showPicker = false;
	}

	function startFromPicker(id: string) {
		store.markInProgress(id);
		closePicker();
	}

	function shufflePicker() {
		// Force re-render by resetting state
		showPicker = false;
		setTimeout(() => (showPicker = true), 0);
	}

	function startCompleting(id: string) {
		completingId = id;
		rating = undefined;
	}

	function completeItem() {
		if (completingId) {
			store.markComplete(completingId, rating);
			const item = store.items.find((i) => i.id === completingId);
			if (item) {
				const xp = store.calculateXP(item);
				// Note: Visual XP celebration animation planned for future enhancement
				// See: docs/future-enhancements.md - XP Rewards & Gamification
				console.log(`+${xp} XP!`);
			}
			completingId = null;
			rating = undefined;
		}
	}

	function cancelCompleting() {
		completingId = null;
		rating = undefined;
	}

	function formatDate(timestamp?: number) {
		if (!timestamp) return '';
		const date = new Date(timestamp);
		return date.toLocaleDateString();
	}

	function openEditModal(item: ReadingItem) {
		editingMetadataItem = item;
	}

	function closeEditModal() {
		editingMetadataItem = null;
	}

	function saveMetadata(updates: Partial<ReadingItem>) {
		if (editingMetadataItem) {
			store.update(editingMetadataItem.id, updates);
			closeEditModal();
		}
	}
</script>

<div class="container mx-auto max-w-4xl px-4 py-8" in:fade={{ duration: 300 }}>
	<header class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-foreground">Reading List</h1>
			<div class="flex gap-2 items-center">
				<button
					onclick={openPicker}
					class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
					disabled={counts.queued === 0}
				>
					What's Next?
				</button>
				<a href="/" class="text-primary hover:text-primary/80 transition-colors">← Back</a>
				<ThemeToggle />
			</div>
		</div>

		<!-- Add Item Form -->
		<form onsubmit={(e) => { e.preventDefault(); addItem(); }} class="flex gap-2">
			<input
				type="text"
				bind:value={newItemTitle}
				placeholder="Add a book or article..."
				class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				type="submit"
				class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={!newItemTitle.trim()}
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
			class="px-4 py-2 font-medium transition-colors {filter === 'queued'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'queued')}
		>
			Queued ({counts.queued})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {filter === 'in-progress'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'in-progress')}
		>
			In Progress ({counts.inProgress})
		</button>
		<button
			class="px-4 py-2 font-medium transition-colors {filter === 'completed'
				? 'border-b-2 border-blue-500 text-blue-600'
				: 'text-gray-600 hover:text-gray-900'}"
			onclick={() => (filter = 'completed')}
		>
			Completed ({counts.completed})
		</button>
	</div>

	<!-- Item List -->
	{#if filteredItems.length === 0}
		<div class="rounded-lg bg-gray-50 p-8 text-center">
			<p class="text-gray-600">
				{filter === 'all'
					? 'No items yet. Say "Read" followed by a title to add one!'
					: filter === 'queued'
						? 'No queued items!'
						: filter === 'in-progress'
							? 'No items in progress!'
							: 'No completed items!'}
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filteredItems as item (item.id)}
				<div
					class="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
					in:slide={{ duration: 300 }}
					out:slide={{ duration: 200 }}
				>
					<div class="flex items-start gap-3">
						<!-- Status Badge -->
						<span class="rounded px-2 py-0.5 text-xs font-medium {STATUS_COLORS[item.status]}">
							{item.status === 'in-progress' ? 'In Progress' : item.status === 'queued' ? 'Queued' : 'Completed'}
						</span>

						<!-- Content -->
						<div class="flex-1">
							{#if editingId === item.id}
								<input
									type="text"
									bind:value={editTitle}
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
									onclick={() => startEdit(item.id, item.title)}
									class="w-full text-left text-lg font-semibold {item.status === 'completed'
										? 'text-gray-400 line-through'
										: 'text-gray-900'} hover:text-blue-600"
								>
									{item.title}
								</button>
							{/if}

							<!-- Metadata -->
							<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
								<!-- Type Badge -->
								<span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
									{READING_TYPE_LABELS[item.type]}
								</span>

								{#if item.completedAt}
									<span class="text-xs text-gray-500">
										Completed: {formatDate(item.completedAt)}
									</span>
								{/if}

								{#if item.rating}
									<span class="text-xs text-yellow-600">
										{'⭐'.repeat(item.rating)}
									</span>
								{/if}
							</div>

							{#if item.source}
								<div class="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
									<span>📝</span>
									<span>{item.source}</span>
								</div>
							{/if}

							{#if item.notes}
								<div class="mt-2 rounded bg-muted p-2 text-sm text-muted-foreground">
									<div class="flex items-start gap-1">
										<span>💭</span>
										<span class="flex-1">{item.notes}</span>
									</div>
								</div>
							{/if}

							{#if item.tags && item.tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each item.tags as tag}
										<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
											🏷️ {tag}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Actions -->
						<div class="flex items-center gap-2">
							<!-- Edit Details Button -->
							<button
								onclick={() => openEditModal(item)}
								class="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
								title="Edit Details"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>

							<!-- Type Selector -->
							<select
								value={item.type}
								onchange={(e) => {
									const val = e.currentTarget.value as ReadingItemType | '';
									setType(item.id, val);
								}}
								class="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
							>
								<option value="book">Book</option>
								<option value="article">Article</option>
								<option value="other">Other</option>
							</select>

							<!-- Status Actions -->
							{#if item.status === 'queued'}
								<button
									onclick={() => store.markInProgress(item.id)}
									class="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
								>
									Start
								</button>
							{:else if item.status === 'in-progress'}
								<button
									onclick={() => startCompleting(item.id)}
									class="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
								>
									Complete
								</button>
							{/if}

							<!-- Archive Button -->
							<button
								onclick={() => store.archive(item.id)}
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
							{#if deleteConfirmId === item.id}
								<div class="flex gap-1">
									<button
										onclick={() => confirmDelete(item.id)}
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
									onclick={() => (deleteConfirmId = item.id)}
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
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- What's Next? Picker Modal -->
{#if showPicker}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={closePicker}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 200 }}
	>
		<div
			class="max-w-2xl rounded-lg bg-card p-6 shadow-xl border border-border"
			onclick={(e) => e.stopPropagation()}
			in:scale={{ duration: 300, start: 0.95 }}
			out:scale={{ duration: 200, start: 0.95 }}
		>
			<h2 class="mb-4 text-2xl font-bold text-foreground">What should you read next?</h2>

			{#if pickerItems.length === 0}
				<p class="text-muted-foreground">No queued items! Add some reading items first.</p>
			{:else}
				<div class="space-y-4">
					{#each pickerItems as item (item.id)}
						<div class="flex items-center justify-between rounded-lg border border-gray-200 p-4">
							<div>
								<h3 class="font-semibold text-gray-900">{item.title}</h3>
								<div class="mt-1 flex gap-2 text-sm text-gray-500">
									<span>{READING_TYPE_LABELS[item.type]}</span>
									{#if item.source}
										<span>• {item.source}</span>
									{/if}
								</div>
							</div>
							<button
								onclick={() => startFromPicker(item.id)}
								class="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
							>
								Start This One
							</button>
						</div>
					{/each}
				</div>

				<div class="mt-6 flex justify-between">
					<button
						onclick={shufflePicker}
						class="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
					>
						Shuffle
					</button>
					<button
						onclick={closePicker}
						class="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
					>
						Cancel
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Completion Rating Modal -->
{#if completingId}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		onclick={cancelCompleting}
	>
		<div
			class="max-w-md rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-2xl font-bold text-gray-900">How was it?</h2>
			<p class="mb-4 text-gray-600">Rate this item (optional):</p>

			<div class="mb-6 flex justify-center gap-2">
				{#each [1, 2, 3, 4, 5] as star}
					<button
						onclick={() => (rating = star as 1 | 2 | 3 | 4 | 5)}
						class="text-3xl {rating && rating >= star ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500"
					>
						⭐
					</button>
				{/each}
			</div>

			<div class="flex justify-end gap-2">
				<button
					onclick={cancelCompleting}
					class="rounded-lg bg-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-300"
				>
					Cancel
				</button>
				<button
					onclick={completeItem}
					class="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
				>
					Complete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Media Edit Modal -->
{#if editingMetadataItem}
	<MediaEditModal
		item={editingMetadataItem}
		itemType="reading"
		onSave={saveMetadata}
		onCancel={closeEditModal}
	/>
{/if}
