<script lang="ts">
    import type { Section } from "$lib/utils/day-grouper";

    interface Props {
        sections: Section[];
    }

    const { sections }: Props = $props();
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
                <ul class="list-none flex flex-col gap-2">
                    {#each section.entries as entry (entry.id)}
                        <li
                            class="flex items-start gap-2 py-2 px-4 rounded-md bg-card border border-border"
                        >
                            <span
                                class="shrink-0 text-xs uppercase tracking-[0.05em] py-[0.125rem] px-2 rounded-sm bg-muted text-muted-foreground badge-{entry.category}"
                                >{entry.category}</span
                            >
                            <span
                                class="flex-auto text-base leading-[1.6] text-foreground break-words"
                                class:line-through={entry.done}
                                class:opacity-60={entry.done}
                                >{entry.displayText}</span
                            >
                        </li>
                    {/each}
                </ul>
            </section>
        {/each}
    </div>
{/if}
