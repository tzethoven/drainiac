<script lang="ts">
	import { createProgressStore } from '$lib/utils/progress-store.svelte';

	const progressStore = createProgressStore();
	const xpProgress = $derived(progressStore.getXPProgress());
</script>

<div class="rounded-lg border border-border bg-card p-4 mb-6">
	<div class="flex items-center justify-between gap-4">
		<!-- Level Badge -->
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
				{progressStore.progress.level}
			</div>
			<div>
				<div class="text-sm font-medium text-foreground">Level {progressStore.progress.level}</div>
				<div class="text-xs text-muted-foreground">
					{progressStore.progress.todosCompleted} todos completed
				</div>
			</div>
		</div>

		<!-- Streak Indicator -->
		{#if progressStore.progress.currentStreak > 0}
			<div class="flex items-center gap-2 rounded-lg bg-orange-100 dark:bg-orange-950 px-3 py-2">
				<span class="text-2xl">🔥</span>
				<div class="text-sm">
					<div class="font-semibold text-orange-700 dark:text-orange-300">
						{progressStore.progress.currentStreak} day{progressStore.progress.currentStreak !== 1 ? 's' : ''}
					</div>
					<div class="text-xs text-orange-600 dark:text-orange-400">streak</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- XP Progress Bar -->
	<div class="mt-4">
		<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground">
			<span>{Math.floor(xpProgress.current)} / {xpProgress.total} XP</span>
			<span>Next level: {progressStore.xpToNextLevel} XP</span>
		</div>
		<div class="h-2 overflow-hidden rounded-full bg-muted">
			<div
				class="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
				style="width: {Math.min(xpProgress.percentage, 100)}%"
			></div>
		</div>
	</div>
</div>
