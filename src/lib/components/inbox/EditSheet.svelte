<script lang="ts">
  import { untrack } from "svelte";
  import BottomSheet from "$lib/components/ui/BottomSheet.svelte";
  import type { Entry } from "$lib/stores/entries-store.svelte";
  import { getEntriesContext } from "$lib/stores/entries-store.svelte";
  import { isBlank } from "$lib/utils/edit-text";
  import { effectiveText } from "$lib/utils/effective-text";
  import type { Category } from "$lib/utils/transcript-parser";

  interface Props {
    entry: Entry;
    onClose: () => void;
  }

  const { entry, onClose }: Props = $props();

  const store = getEntriesContext();

  // Stage text and category locally; nothing is written to the
  // store until Save. Cancel discards both. Seed from the entry
  // once — a fresh EditSheet is mounted per entry, so initial
  // capture is intentional.
  let value = $state(untrack(() => effectiveText(entry)));
  let category = $state<Category>(untrack(() => entry.category));

  let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);

  // Autofocus and place caret at end.
  // Chrome Android will only pop the soft keyboard if focus() happens after
  // the textarea is laid out, so we wait for a paint frame.
  $effect(() => {
    const el = textareaEl;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.focus({ preventScroll: true });
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
    return () => cancelAnimationFrame(id);
  });

  const blank = $derived(isBlank(value));

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: "todo", label: "Todo" },
    { value: "note", label: "Note" },
    { value: "idea", label: "Idea" },
  ];

  function chooseCategory(next: Category) {
    category = next;
  }

  function save() {
    if (blank) return;
    // Commit staged changes. Order doesn't matter for invariants:
    // `setCategory` doesn't touch polish, and `editText` runs its
    // three-case logic against the store's current entry state.
    if (category !== entry.category) {
      store.setCategory(entry.id, category);
    }
    // The three-case save logic (no-op / polish-clear / plain write)
    // lives inside `store.editText`, so the invariants are enforced
    // structurally and can't be bypassed by callers.
    store.editText(entry.id, value);
    onClose();
  }

  const canRevert = $derived(entry.polish != null);

  function revert() {
    // Clear polish metadata in one shot. `displayText` and
    // `rawTranscript` are untouched — long-press can re-polish.
    store.revertPolish(entry.id);
    onClose();
  }
</script>

<BottomSheet open={true} {onClose} labelledBy="edit-sheet-title">
  <div class="flex flex-col gap-3 px-4 pb-4">
    <!-- Visually hidden title so the dialog has an accessible name -->
    <h2 id="edit-sheet-title" class="sr-only">Edit entry</h2>

    <textarea
      bind:this={textareaEl}
      bind:value
      rows={3}
      class="w-full resize-none rounded-md border border-border bg-background text-foreground text-base leading-[1.6] p-3 focus:outline-none focus:ring-2 focus:ring-ring"
    ></textarea>

    <div
      class="flex gap-2"
      role="radiogroup"
      aria-label="Category"
    >
      {#each CATEGORIES as opt (opt.value)}
        <button
          type="button"
          role="radio"
          aria-checked={category === opt.value}
          class="text-xs uppercase tracking-[0.05em] px-3 py-1 rounded-sm border badge-{opt.value}"
          class:bg-foreground={category === opt.value}
          class:text-background={category === opt.value}
          class:border-foreground={category === opt.value}
          class:bg-muted={category !== opt.value}
          class:text-muted-foreground={category !== opt.value}
          class:border-border={category !== opt.value}
          onclick={() => chooseCategory(opt.value)}
        >
          {opt.label}
        </button>
      {/each}
    </div>

    <div class="flex justify-end gap-2">
      {#if canRevert}
        <button
          type="button"
          class="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground mr-auto"
          onclick={revert}
        >
          Revert to original
        </button>
      {/if}
      <button
        type="button"
        class="px-4 py-2 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground"
        onclick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={blank}
        onclick={save}
      >
        Save
      </button>
    </div>
  </div>
</BottomSheet>
