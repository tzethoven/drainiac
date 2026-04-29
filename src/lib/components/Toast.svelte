<script lang="ts">
  import { fly } from "svelte/transition";
  import { getToastContext } from "$lib/stores/toast-store.svelte";
  import { getEntriesContext } from "$lib/stores/entries-store.svelte";

  const toast = getToastContext();
  const entries = getEntriesContext();

  function undo() {
    const entry = toast.undoEntry;
    if (entry) entries.restore(entry);
    toast.dismiss();
  }
</script>

{#if toast.message !== null}
  <div
    transition:fly={{ y: 16, duration: 200 }}
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg bg-foreground text-background shadow-lg whitespace-nowrap"
    role="status"
    aria-live="polite"
  >
    {#if toast.undoEntry}
      <span class="text-sm">{toast.message} —</span>
      <button
        type="button"
        class="text-sm font-semibold uppercase tracking-wider underline underline-offset-2"
        onclick={undo}
      >
        Undo
      </button>
    {:else}
      <span class="text-sm">{toast.message}</span>
    {/if}
  </div>
{/if}
