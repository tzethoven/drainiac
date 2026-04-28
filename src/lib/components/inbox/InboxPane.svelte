<script lang="ts">
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";
    import type { Category } from "$lib/utils/transcript-parser";
    import { group } from "$lib/utils/day-grouper";
    import InboxList from "./InboxList.svelte";

    type Filter = "all" | Category;

    const store = getEntriesContext();
    let filter = $state<Filter>("all");

    const filtered = $derived(
        filter === "all"
            ? store.entries
            : store.entries.filter((e) => e.category === filter),
    );
    const sections = $derived(group(filtered, Date.now()));
    const hasDone = $derived(store.entries.some((e) => e.done));

    const chips: { value: Filter; label: string }[] = [
        { value: "all", label: "All" },
        { value: "todo", label: "Todo" },
        { value: "note", label: "Note" },
        { value: "idea", label: "Idea" },
    ];
</script>

<div class="flex flex-col gap-4">
    <header
        class="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur flex flex-col gap-3 border-b border-border"
    >
        <div class="flex items-center justify-between">
            <h1 class="text-sm font-semibold uppercase tracking-wider">Inbox</h1>
            <button
                type="button"
                class="text-xs uppercase tracking-wider px-3 py-1 rounded-md border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!hasDone}
                onclick={() => store.clearDone()}
            >
                Clear done
            </button>
        </div>
        <div class="flex gap-2" role="tablist" aria-label="Filter by category">
            {#each chips as chip (chip.value)}
                <button
                    type="button"
                    role="tab"
                    aria-selected={filter === chip.value}
                    class="text-xs uppercase tracking-wider px-3 py-1 rounded-full border"
                    class:bg-foreground={filter === chip.value}
                    class:text-background={filter === chip.value}
                    class:border-foreground={filter === chip.value}
                    class:border-border={filter !== chip.value}
                    onclick={() => (filter = chip.value)}
                >
                    {chip.label}
                </button>
            {/each}
        </div>
    </header>

    <InboxList {sections} />
</div>
