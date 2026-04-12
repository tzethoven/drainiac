<script lang="ts">
	import { createEndOfDayStore } from '$lib/utils/end-of-day-store.svelte';
	import { createTranscriptionStore } from '$lib/utils/transcription-store.svelte';
	import { createTodoStore } from '$lib/utils/todo-store.svelte';
	import { createProgressStore } from '$lib/utils/progress-store.svelte';
	import { createReadingStore } from '$lib/utils/reading-store.svelte';
	import { createWatchStore } from '$lib/utils/watch-store.svelte';
	import type { ProcessableItem } from '$lib/types/end-of-day';
	import type { Category } from '$lib/types/transcription';
	import type { Todo } from '$lib/types/todo';
	import type { ReadingItem, WatchItem } from '$lib/types/media';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import XPGainAnimation from '$lib/components/XPGainAnimation.svelte';
	import LevelUpModal from '$lib/components/LevelUpModal.svelte';
	import { fade, slide } from 'svelte/transition';
	import { goto } from '$app/navigation';

	const eodStore = createEndOfDayStore();
	const transcriptionStore = createTranscriptionStore();
	const todoStore = createTodoStore();
	const progressStore = createProgressStore();
	const readingStore = createReadingStore();
	const watchStore = createWatchStore();

	let showSummary = $state(false);
	let itemsProcessedCount = $state(0);
	let reflectionNote = $state('');
	let showCategoryPicker = $state(false);
	let selectedCategory = $state<Category | null>(null);
	let showXPGain = $state(false);
	let xpGained = $state(0);
	let showLevelUp = $state(false);
	let newLevel = $state(1);

	const currentItem = $derived(eodStore.currentItem);
	const progress = $derived(eodStore.getProgress());
	const isComplete = $derived(progress.current >= progress.total && progress.total > 0);

	// Build queue on mount
	$effect(() => {
		if (!eodStore.inProgress && eodStore.currentQueue.length === 0) {
			const queue = eodStore.buildQueue(
				transcriptionStore.transcriptions,
				todoStore.todos,
				readingStore.items,
				watchStore.items
			);
			
			if (queue.length === 0) {
				// No items to process - show summary immediately
				showSummary = true;
			} else {
				eodStore.startProcessing(queue);
			}
		}
	});

	// Check if should show summary when queue completes
	$effect(() => {
		if (isComplete && !showSummary) {
			showSummary = true;
		}
	});

	function handleAssignCategory(category: Category) {
		const item = currentItem;
		if (!item || item.type !== 'uncategorized-transcription') return;

		// Update the transcription with the category
		// Note: We'll need to add an update method to transcription store
		// For now, we'll just remove it and count it as processed
		transcriptionStore.remove(item.id);
		
		// If category is 'todo', 'read', or 'watch', add to appropriate store
		if (category === 'todo') {
			todoStore.add(item.data.text);
		} else if (category === 'read') {
			readingStore.add(item.data.text);
		} else if (category === 'watch') {
			watchStore.add(item.data.text);
		}

		itemsProcessedCount++;
		eodStore.processNextItem();
		showCategoryPicker = false;
	}

	function handleDelete() {
		const item = currentItem;
		if (!item) return;

		// Delete from appropriate store
		switch (item.type) {
			case 'uncategorized-transcription':
				transcriptionStore.remove(item.id);
				break;
			case 'completed-todo':
				todoStore.remove(item.id);
				break;
			case 'reading-item':
				readingStore.remove(item.id);
				break;
			case 'watch-item':
				watchStore.remove(item.id);
				break;
		}

		itemsProcessedCount++;
		eodStore.processNextItem();
	}

	function handleArchive() {
		const item = currentItem;
		if (!item || item.type !== 'completed-todo') return;

		todoStore.archive(item.id);
		itemsProcessedCount++;
		eodStore.processNextItem();
	}

	function handleKeepActive() {
		const item = currentItem;
		if (!item || item.type !== 'completed-todo') return;

		todoStore.toggleComplete(item.id); // Toggle back to pending
		itemsProcessedCount++;
		eodStore.processNextItem();
	}

	function handleStart() {
		const item = currentItem;
		if (!item) return;

		if (item.type === 'reading-item') {
			readingStore.markInProgress(item.id);
		} else if (item.type === 'watch-item') {
			watchStore.markInProgress(item.id);
		}

		itemsProcessedCount++;
		eodStore.processNextItem();
	}

	function handleSkip() {
		eodStore.skipCurrentItem();
	}

	function completeRitual() {
		const todosCompletedToday = todoStore.todos.filter(t => {
			if (t.status !== 'complete' || !t.completedAt) return false;
			const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
			const today = new Date().toISOString().split('T')[0];
			return completedDate === today;
		}).length;

		const result = eodStore.completeRitual(
			itemsProcessedCount,
			todosCompletedToday,
			reflectionNote || undefined,
			progressStore
		);

		// Show XP gain animation if bonus awarded
		if (result.bonusXP > 0) {
			xpGained = result.bonusXP;
			showXPGain = true;
			setTimeout(() => {
				showXPGain = false;
			}, 1000);

			// Show level up modal if leveled up
			if (result.levelUp) {
				newLevel = result.newLevel;
				showLevelUp = true;
			}
		}

		// Return to home after a short delay
		setTimeout(() => {
			goto('/');
		}, result.levelUp ? 3500 : 1500);
	}

	function getItemText(item: ProcessableItem): string {
		if ('text' in item.data) return item.data.text;
		if ('title' in item.data) return item.data.title;
		return '';
	}

	function getItemTypeBadge(item: ProcessableItem): { label: string; icon: string } {
		switch (item.type) {
			case 'uncategorized-transcription':
				return { label: 'Uncategorized', icon: '📝' };
			case 'completed-todo':
				return { label: 'Completed Todo', icon: '☑️' };
			case 'reading-item':
				return { label: 'Reading', icon: '📖' };
			case 'watch-item':
				return { label: 'Watch', icon: '▶️' };
			default:
				return { label: 'Item', icon: '📄' };
		}
	}
</script>

<div class="container">
	<header>
		<div class="header-content">
			<h1>🌙 End of Day</h1>
			<ThemeToggle />
		</div>
	</header>

	<main>
		{#if showSummary}
			<!-- Summary Page -->
			<div class="summary" in:fade={{ duration: 300 }}>
				<div class="summary-card">
					<h2>
						{#if eodStore.currentQueue.length === 0}
							🎉 Nothing to Process!
						{:else}
							✨ Day Complete!
						{/if}
					</h2>
					
					{#if eodStore.currentQueue.length === 0}
						<p class="summary-message">
							You're all caught up. Great job staying on top of things!
						</p>
					{:else}
						<p class="summary-message">
							Great work today! Here's what you achieved:
						</p>

						<div class="stats-grid">
							<div class="stat-card">
								<div class="stat-icon">📝</div>
								<div class="stat-value">{itemsProcessedCount}</div>
								<div class="stat-label">Items Processed</div>
							</div>

							<div class="stat-card">
								<div class="stat-icon">☑️</div>
								<div class="stat-value">{progressStore.progress.todosCompleted}</div>
								<div class="stat-label">Todos Completed</div>
							</div>

							<div class="stat-card">
								<div class="stat-icon">⚡</div>
								<div class="stat-value">{progressStore.progress.xp} XP</div>
								<div class="stat-label">Total XP</div>
							</div>

							<div class="stat-card">
								<div class="stat-icon">🔥</div>
								<div class="stat-value">{progressStore.progress.currentStreak}</div>
								<div class="stat-label">Day Streak</div>
							</div>
						</div>

						{#if !eodStore.wasCompletedToday()}
							<div class="bonus-xp">
								<p>🎁 Completing your end-of-day ritual: <strong>+50 XP!</strong></p>
							</div>
						{/if}
					{/if}

					<!-- Reflection Prompt -->
					<div class="reflection">
						<label for="reflection">How are you feeling about today? (optional)</label>
						<textarea
							id="reflection"
							bind:value={reflectionNote}
							placeholder="What went well? What could be better tomorrow?"
							rows="4"
						></textarea>
					</div>

					<div class="summary-actions">
						<button class="btn-primary" onclick={completeRitual}>
							Finish
						</button>
					</div>
				</div>
			</div>
		{:else if currentItem}
			<!-- Processing View -->
			<div class="processing" in:fade={{ duration: 300 }}>
				<!-- Progress Bar -->
				<div class="progress-header">
					<div class="progress-text">
						Item {progress.current} of {progress.total}
					</div>
					<div class="progress-bar-container">
						<div class="progress-bar" style="width: {progress.percentage}%"></div>
					</div>
				</div>

				<!-- Item Card -->
				<div class="item-card" in:slide={{ duration: 300 }}>
					<div class="item-badge">
						{getItemTypeBadge(currentItem).icon}
						{getItemTypeBadge(currentItem).label}
					</div>
					
					<div class="item-text">
						{getItemText(currentItem)}
					</div>

					<!-- Actions based on item type -->
					<div class="item-actions">
						{#if currentItem.type === 'uncategorized-transcription'}
							<button class="btn-action" onclick={() => showCategoryPicker = true}>
								🏷️ Assign Category
							</button>
							<button class="btn-action" onclick={handleDelete}>
								🗑️ Delete
							</button>
						{:else if currentItem.type === 'completed-todo'}
							<button class="btn-action" onclick={handleArchive}>
								📦 Archive
							</button>
							<button class="btn-action" onclick={handleKeepActive}>
								↩️ Keep Active
							</button>
						{:else if currentItem.type === 'reading-item' || currentItem.type === 'watch-item'}
							<button class="btn-action" onclick={handleStart}>
								▶️ Start Now
							</button>
							<button class="btn-action" onclick={handleDelete}>
								🗑️ Delete
							</button>
						{/if}

						<button class="btn-skip" onclick={handleSkip}>
							⏭️ Skip
						</button>
					</div>
				</div>

				<!-- Category Picker Modal -->
				{#if showCategoryPicker}
					<div class="modal-backdrop" onclick={() => showCategoryPicker = false} transition:fade={{ duration: 200 }}>
						<div class="modal" onclick={(e) => e.stopPropagation()} transition:fade={{ duration: 200 }}>
							<h3>Assign Category</h3>
							<div class="category-grid">
								<button class="category-btn" onclick={() => handleAssignCategory('todo')}>
									☑️ Todo
								</button>
								<button class="category-btn" onclick={() => handleAssignCategory('read')}>
									📖 Read
								</button>
								<button class="category-btn" onclick={() => handleAssignCategory('watch')}>
									▶️ Watch
								</button>
								<button class="category-btn" onclick={() => handleAssignCategory('note')}>
									📄 Note
								</button>
								<button class="category-btn" onclick={() => handleAssignCategory('idea')}>
									💡 Idea
								</button>
								<button class="category-btn" onclick={() => handleAssignCategory('habit')}>
									🎯 Habit
								</button>
							</div>
							<button class="btn-cancel" onclick={() => showCategoryPicker = false}>Cancel</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="loading" in:fade={{ duration: 300 }}>
				<p>Building your queue...</p>
			</div>
		{/if}
	</main>
</div>

<!-- XP Gain Animation -->
{#if showXPGain}
	<XPGainAnimation xp={xpGained} />
{/if}

<!-- Level Up Modal -->
{#if showLevelUp}
	<LevelUpModal level={newLevel} onClose={() => showLevelUp = false} />
{/if}

<style>
	.container {
		min-height: 100vh;
		background: var(--bg-subtle);
		padding-bottom: var(--spacing-2xl);
	}

	header {
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-default);
		padding: var(--spacing-lg);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		font-size: var(--font-size-h1);
		font-weight: 600;
		margin: 0;
	}

	main {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--spacing-2xl) var(--spacing-lg);
	}

	/* Processing View */
	.progress-header {
		margin-bottom: var(--spacing-xl);
	}

	.progress-text {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
		margin-bottom: var(--spacing-sm);
		text-align: center;
	}

	.progress-bar-container {
		height: 8px;
		background: var(--border-default);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple));
		transition: width var(--timing-normal) var(--ease-out);
	}

	.item-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		padding: var(--spacing-2xl);
		box-shadow: var(--shadow-md);
	}

	.item-badge {
		display: inline-block;
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--bg-muted);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		margin-bottom: var(--spacing-lg);
	}

	.item-text {
		font-size: var(--font-size-h3);
		line-height: 1.6;
		margin-bottom: var(--spacing-2xl);
		min-height: 80px;
	}

	.item-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-md);
	}

	.btn-action {
		flex: 1;
		min-width: 150px;
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.btn-action:hover {
		background: var(--bg-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
	}

	.btn-skip {
		flex: 1;
		min-width: 150px;
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--bg-muted);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.btn-skip:hover {
		background: var(--bg-hover);
	}

	/* Summary View */
	.summary-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		padding: var(--spacing-2xl);
		box-shadow: var(--shadow-md);
	}

	.summary-card h2 {
		font-size: var(--font-size-h1);
		margin-bottom: var(--spacing-lg);
		text-align: center;
	}

	.summary-message {
		text-align: center;
		color: var(--text-muted);
		margin-bottom: var(--spacing-2xl);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-2xl);
	}

	.stat-card {
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		text-align: center;
	}

	.stat-icon {
		font-size: 2rem;
		margin-bottom: var(--spacing-sm);
	}

	.stat-value {
		font-size: var(--font-size-h2);
		font-weight: 600;
		margin-bottom: var(--spacing-xs);
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.bonus-xp {
		background: linear-gradient(135deg, var(--accent-blue-subtle), var(--accent-purple-subtle));
		border-radius: var(--radius-md);
		padding: var(--spacing-lg);
		text-align: center;
		margin-bottom: var(--spacing-2xl);
	}

	.bonus-xp strong {
		color: var(--accent-blue);
	}

	.reflection {
		margin-bottom: var(--spacing-2xl);
	}

	.reflection label {
		display: block;
		font-size: var(--font-size-base);
		margin-bottom: var(--spacing-sm);
		color: var(--text-secondary);
	}

	.reflection textarea {
		width: 100%;
		padding: var(--spacing-md);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		background: var(--bg-card);
		color: var(--text-primary);
		font-family: inherit;
		font-size: var(--font-size-base);
		resize: vertical;
	}

	.summary-actions {
		display: flex;
		justify-content: center;
	}

	.btn-primary {
		padding: var(--spacing-md) var(--spacing-2xl);
		background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		font-weight: 600;
		cursor: pointer;
		transition: transform var(--timing-fast) var(--ease-out);
	}

	.btn-primary:hover {
		transform: scale(1.05);
	}

	.btn-primary:active {
		transform: scale(0.98);
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: var(--spacing-lg);
	}

	.modal {
		background: var(--bg-surface);
		border-radius: var(--radius-lg);
		padding: var(--spacing-2xl);
		max-width: 500px;
		width: 100%;
		box-shadow: var(--shadow-lg);
	}

	.modal h3 {
		font-size: var(--font-size-h3);
		margin-bottom: var(--spacing-lg);
		text-align: center;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-lg);
	}

	.category-btn {
		padding: var(--spacing-lg);
		background: var(--bg-card);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		cursor: pointer;
		transition: all var(--timing-fast) var(--ease-out);
	}

	.category-btn:hover {
		background: var(--bg-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-sm);
	}

	.btn-cancel {
		width: 100%;
		padding: var(--spacing-md);
		background: var(--bg-muted);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.loading {
		text-align: center;
		padding: var(--spacing-2xl);
		color: var(--text-muted);
	}
</style>
