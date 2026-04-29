<script lang="ts">
  import BottomSheet from "$lib/components/ui/BottomSheet.svelte";
  import type { Entry } from "$lib/stores/entries-store.svelte";
  import { getEntriesContext } from "$lib/stores/entries-store.svelte";
  import type { Category } from "$lib/utils/transcript-parser";

  interface Props {
    entry: Entry;
    onClose: () => void;
  }

  const { entry, onClose }: Props = $props();

  const store = getEntriesContext();

  const ALL_CATEGORIES: { value: Category; label: string }[] = [
    { value: "todo", label: "Todo" },
    { value: "note", label: "Note" },
    { value: "idea", label: "Idea" },
  ];

  const options = $derived(ALL_CATEGORIES.filter((c) => c.value !== entry.category));

  function choose(category: Category) {
    store.update(entry.id, { category });
    onClose();
  }
</script>

<BottomSheet open={true} {onClose} labelledBy="menu-sheet-title">
  <div class="flex flex-col px-4 pb-2">
    <h2
      id="menu-sheet-title"
      class="text-xs uppercase tracking-[0.05em] text-muted-foreground px-1 pt-1 pb-2"
    >
      Change category
    </h2>

    <ul class="list-none flex flex-col">
      {#each options as opt (opt.value)}
        <li>
          <button
            type="button"
            class="w-full flex items-center gap-3 py-3 px-1 text-left rounded-md hover:bg-muted"
            onclick={() => choose(opt.value)}
          >
            <span
              class="shrink-0 text-xs uppercase tracking-[0.05em] py-[0.125rem] px-2 rounded-sm bg-muted text-muted-foreground badge-{opt.value}"
            >{opt.value}</span>
            <span class="text-base text-foreground">{opt.label}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</BottomSheet>
