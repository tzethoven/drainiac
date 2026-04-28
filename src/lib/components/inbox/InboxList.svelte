<script lang="ts">
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";

    const store = getEntriesContext();
</script>

<ul class="list-none m-0 py-4 px-6 flex flex-col gap-2 w-[min(100%,32rem)] mx-auto" aria-label="Captured entries">
    {#each store.entries as entry (entry.id)}
        <li class="flex items-start gap-2 py-2 px-4 rounded-md bg-card border border-border">
            <span class="shrink-0 text-xs uppercase tracking-[0.05em] py-[0.125rem] px-2 rounded-sm bg-muted text-muted-foreground badge-{entry.category}">{entry.category}</span>
            <span class="flex-auto text-base leading-[1.6] text-foreground break-words">{entry.displayText}</span>
        </li>
    {:else}
        <li class="text-muted-foreground text-sm text-center p-6">No entries yet. Hold the button and speak.</li>
    {/each}
</ul>
