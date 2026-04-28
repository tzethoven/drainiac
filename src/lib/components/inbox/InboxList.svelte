<script lang="ts">
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";

    const store = getEntriesContext();
</script>

<ul class="inbox-list" aria-label="Captured entries">
    {#each store.entries as entry (entry.id)}
        <li class="entry">
            <span class="badge badge-{entry.category}">{entry.category}</span>
            <span class="text">{entry.displayText}</span>
        </li>
    {:else}
        <li class="empty muted">No entries yet. Hold the button and speak.</li>
    {/each}
</ul>

<style>
    .inbox-list {
        list-style: none;
        margin: 0;
        padding: var(--spacing-md) var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
        width: min(100%, 32rem);
        margin-inline: auto;
    }

    .entry {
        display: flex;
        align-items: flex-start;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-md);
        background: var(--card, transparent);
        border: 1px solid var(--border);
    }

    .badge {
        flex: 0 0 auto;
        font-size: var(--font-size-xs, 0.75rem);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.125rem 0.5rem;
        border-radius: var(--radius-sm);
        background: var(--muted);
        color: var(--muted-foreground);
    }

    .badge-todo {
        background: color-mix(in oklab, var(--primary) 20%, transparent);
        color: var(--primary);
    }

    .badge-idea {
        background: color-mix(in oklab, var(--accent, var(--primary)) 20%, transparent);
        color: var(--accent-foreground, var(--primary));
    }

    .text {
        flex: 1 1 auto;
        font-size: var(--font-size-body);
        line-height: var(--line-height-normal);
        color: var(--foreground);
        word-break: break-word;
    }

    .empty {
        color: var(--muted-foreground);
        font-size: var(--font-size-small);
        text-align: center;
        padding: var(--spacing-lg);
    }
</style>
