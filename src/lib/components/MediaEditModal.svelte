<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { ReadingItem } from '$lib/types/media';
	import type { WatchItem } from '$lib/types/media';
	import { READING_TYPE_LABELS, WATCH_TYPE_LABELS } from '$lib/types/media';

	interface Props {
		item: ReadingItem | WatchItem;
		itemType: 'reading' | 'watching';
		onSave: (updates: Partial<ReadingItem | WatchItem>) => void;
		onCancel: () => void;
	}

	let { item, itemType, onSave, onCancel }: Props = $props();

	let title = $state(item.title);
	let type = $state(item.type);
	let source = $state(item.source || '');
	let notes = $state(item.notes || '');
	let tagsInput = $state(item.tags?.join(', ') || '');

	const typeLabels = itemType === 'reading' ? READING_TYPE_LABELS : WATCH_TYPE_LABELS;
	const sourcePlaceholder = itemType === 'reading' 
		? 'Author, publication, or URL'
		: 'Platform, creator, or URL';

	function handleSave() {
		// Parse tags from comma-separated input
		const tags = tagsInput
			.split(',')
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		onSave({
			title: title.trim(),
			type,
			source: source.trim() || undefined,
			notes: notes.trim() || undefined,
			tags: tags.length > 0 ? tags : undefined
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
	onclick={onCancel}
	in:fade={{ duration: 200 }}
	out:fade={{ duration: 200 }}
>
	<div
		class="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
		onclick={(e) => e.stopPropagation()}
		in:scale={{ duration: 300, start: 0.95 }}
		out:scale={{ duration: 200, start: 0.95 }}
	>
		<h2 class="mb-4 text-2xl font-bold text-foreground">Edit Details</h2>

		<form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
			<!-- Title -->
			<div>
				<label for="title" class="mb-1 block text-sm font-medium text-foreground">
					Title
				</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
					required
				/>
			</div>

			<!-- Type -->
			<div>
				<label for="type" class="mb-1 block text-sm font-medium text-foreground">
					Type
				</label>
				<select
					id="type"
					bind:value={type}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
				>
					{#each Object.entries(typeLabels) as [value, label]}
						<option value={value}>{label}</option>
					{/each}
				</select>
			</div>

			<!-- Source -->
			<div>
				<label for="source" class="mb-1 block text-sm font-medium text-foreground">
					Source
				</label>
				<input
					id="source"
					type="text"
					bind:value={source}
					placeholder={sourcePlaceholder}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- Notes -->
			<div>
				<label for="notes" class="mb-1 block text-sm font-medium text-foreground">
					Notes
				</label>
				<textarea
					id="notes"
					bind:value={notes}
					placeholder="Your thoughts, takeaways, or reflections..."
					rows="4"
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
				></textarea>
			</div>

			<!-- Tags -->
			<div>
				<label for="tags" class="mb-1 block text-sm font-medium text-foreground">
					Tags
				</label>
				<input
					id="tags"
					type="text"
					bind:value={tagsInput}
					placeholder="productivity, work, fiction (comma-separated)"
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
				/>
				<p class="mt-1 text-xs text-muted-foreground">Separate tags with commas</p>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 pt-2">
				<button
					type="button"
					onclick={onCancel}
					class="rounded-lg border border-border bg-background px-4 py-2 font-medium text-foreground hover:bg-muted transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
				>
					Save
				</button>
			</div>
		</form>
	</div>
</div>
