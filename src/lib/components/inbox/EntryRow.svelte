<script lang="ts">
  import { Trash2, Check } from "@lucide/svelte";
  import type { Entry } from "$lib/stores/entries-store.svelte";
  import { getEntriesContext } from "$lib/stores/entries-store.svelte";
  import { getToastContext } from "$lib/stores/toast-store.svelte";
  import { createSwipeState } from "./swipe-state";

  interface Props {
    entry: Entry;
  }

  const { entry }: Props = $props();

  const store = getEntriesContext();
  const toast = getToastContext();

  let liEl = $state<HTMLLIElement | undefined>(undefined);

  type Phase = "idle" | "dragging" | "rebounding" | "flying";
  let phase = $state<Phase>("idle");
  let translateX = $state(0);

  let startX = 0;
  let swipe = createSwipeState(100); // placeholder; recreated on each pointerdown
  let activeDirection = $state<"left" | "right" | "none">("none");

  // Contextual label for the right-side reveal background
  const doneLabel = $derived(
    entry.done
      ? entry.category === "todo" ? "Undo Done" : "Undo Reviewed"
      : entry.category === "todo" ? "Done" : "Reviewed"
  );

  // --- Pointer handlers ---

  function onPointerDown(e: PointerEvent) {
    if (phase !== "idle") return;
    startX = e.clientX;
    swipe = createSwipeState(liEl!.offsetWidth);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    phase = "dragging";
  }

  function onPointerMove(e: PointerEvent) {
    if (phase !== "dragging") return;
    translateX = swipe.onMove(e.clientX - startX);
    if (translateX > 0) activeDirection = "right";
    else if (translateX < 0) activeDirection = "left";
  }

  function onPointerUp(e: PointerEvent) {
    if (phase !== "dragging") return;
    const result = swipe.onRelease(e.clientX - startX);
    if (result === "commit-left") startCommitLeft();
    else if (result === "commit-right") startCommitRight();
    else startRebound();
  }

  function onPointerCancel() {
    if (phase !== "dragging") return;
    startRebound();
  }

  function startRebound() {
    phase = "rebounding";
    translateX = 0;
  }

  function onContentTransitionEnd() {
    if (phase === "rebounding") {
      phase = "idle";
      activeDirection = "none";
    }
  }

  function startCommitRight() {
    store.update(entry.id, { done: !entry.done });
    startRebound();
  }

  function startCommitLeft() {
    const li = liEl!;
    const rowWidth = li.offsetWidth;
    const rowHeight = li.offsetHeight;

    // Step 1: fly the row off-screen to the left
    phase = "flying";
    translateX = -(rowWidth + 50);

    setTimeout(() => {
      // Step 2: capture current height and begin collapse animation.
      // Set max-height to the current height first (no transition),
      // then force a reflow so the browser registers the starting value,
      // then switch to max-height: 0 with a transition.
      li.style.maxHeight = `${rowHeight}px`;
      li.style.overflow = "hidden";

      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void li.offsetHeight; // force reflow

      li.style.transition =
        "max-height 200ms ease-out, margin-bottom 200ms ease-out";
      li.style.maxHeight = "0px";
      li.style.marginBottom = "0px";

      setTimeout(() => {
        store.remove(entry.id);
        toast.show("Deleted", entry);
      }, 200);
    }, 200);
  }

  const contentTransition = $derived(
    phase === "rebounding"
      ? "transform 300ms cubic-bezier(0, 0, 0.2, 1)"
      : phase === "flying"
        ? "transform 200ms ease-in"
        : "none",
  );
</script>

<li bind:this={liEl} class="relative isolate rounded-md mb-2 last:mb-0">
  <!-- Done reveal background (left side, revealed by rightward swipe) -->
  <div
    class="absolute inset-0 bg-green-500 flex items-center pl-4 gap-2 rounded-md"
    class:z-10={activeDirection === "right"}
    aria-hidden="true"
  >
    <Check size={20} class="text-white" />
    <span class="text-white text-sm font-semibold uppercase tracking-wider">{doneLabel}</span>
  </div>

  <!-- Delete reveal background (right side, revealed by leftward swipe) -->
  <div
    class="absolute inset-0 bg-destructive flex items-center justify-end pr-4 rounded-md"
    class:z-10={activeDirection === "left"}
    aria-hidden="true"
  >
    <Trash2 size={20} class="text-white" />
  </div>

  <!-- Row content — slides left on swipe -->
  <div
    class="relative z-20 flex items-start gap-2 py-2 px-4 rounded-md bg-card border border-border touch-pan-y select-none"
    style:transform="translateX({translateX}px)"
    style:transition={contentTransition}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerCancel}
    ontransitionend={onContentTransitionEnd}
  >
    <span
      class="shrink-0 text-xs uppercase tracking-[0.05em] py-[0.125rem] px-2 rounded-sm bg-muted text-muted-foreground badge-{entry.category}"
    >{entry.category}</span>
    <span
      class="flex-auto text-base leading-[1.6] text-foreground break-words"
      class:line-through={entry.done}
      class:opacity-60={entry.done}
    >{entry.displayText}</span>
  </div>
</li>
