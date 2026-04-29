<script lang="ts">
    import type { Section } from "$lib/utils/day-grouper";
    import type { Entry } from "$lib/stores/entries-store.svelte";
    import EntryRow from "./EntryRow.svelte";

    interface Props {
        sections: Section[];
        onTap: (entry: Entry) => void;
        onLongPress: (entry: Entry) => void;
    }

    const { sections, onTap, onLongPress }: Props = $props();
</script>

{#if sections.length === 0}
    <p class="text-muted-foreground text-sm text-center p-6">
        No entries yet. Hold the button and speak.
    </p>
{:else}
    <div class="flex flex-col gap-4" aria-label="Captured entries">
        {#each sections as section (section.key)}
            <section class="flex flex-col gap-2">
                <h2
                    class="text-xs uppercase tracking-[0.05em] text-muted-foreground px-1"
                >
                    {section.label}
                </h2>
                <ul class="list-none flex flex-col">
                    {#each section.entries as entry (entry.id)}
                        <EntryRow {entry} {onTap} {onLongPress} />
                    {/each}
                </ul>
            </section>
        {/each}
    </div>
{/if}
