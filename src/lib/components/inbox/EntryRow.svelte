<script lang="ts">
  import { Trash2, Check, AlertTriangle } from "@lucide/svelte";
  import type { Entry } from "$lib/stores/entries-store.svelte";
  import { getEntriesContext } from "$lib/stores/entries-store.svelte";
  import { getToastContext } from "$lib/stores/toast-store.svelte";
  import { createGestureState } from "./gesture-state";

  interface Props {
    entry: Entry;
    onTap: (entry: Entry) => void;
    onLongPress: (entry: Entry) => void;
  }

  const { entry, onTap, onLongPress }: Props = $props();

  const store = getEntriesContext();
  const toast = getToastContext();

  let liEl = $state<HTMLLIElement | undefined>(undefined);

  type Phase = "idle" | "dragging" | "rebounding" | "flying";
  let phase = $state<Phase>("idle");
  let translateX = $state(0);
  let pulsing = $state(false);

  let activeDirection = $state<"left" | "right" | "none">("none");

  // Single gesture instance, reset on each pointerdown to pick up current rowWidth.
  let gesture: ReturnType<typeof createGestureState> | null = null;

  const doneLabel = $derived(
    entry.done
      ? entry.category === "todo" ? "Undo Done" : "Undo Reviewed"
      : entry.category === "todo" ? "Done" : "Reviewed",
  );

  // --- Callbacks invoked by the gesture state machine ---

  function handleTap() {
    // Only fire tap if we haven't visually moved.
    activeDirection = "none";
    onTap(entry);
  }

  function handleLongPress() {
    activeDirection = "none";
    translateX = 0;
    // Haptic (no-op on iOS Safari).
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(10);
    }
    // Visual pulse.
    pulsing = true;
    setTimeout(() => { pulsing = false; }, 120);
    onLongPress(entry);
  }

  function handleCommitLeft() {
    startCommitLeft();
  }

  function handleCommitRight() {
    startCommitRight();
  }

  function handleRebound() {
    startRebound();
  }

  // --- Pointer handlers ---

  function onPointerDown(e: PointerEvent) {
    if (phase !== "idle" && phase !== "dragging") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture = createGestureState({
      rowWidth: liEl!.offsetWidth,
      scheduler: (ms, cb) => {
        const id = window.setTimeout(cb, ms);
        return () => window.clearTimeout(id);
      },
      callbacks: {
        onTap: handleTap,
        onLongPress: handleLongPress,
        onCommitLeft: handleCommitLeft,
        onCommitRight: handleCommitRight,
        onRebound: handleRebound,
      },
    });
    phase = "dragging";
    translateX = 0;
    activeDirection = "none";
    gesture.onDown(e.clientX);
  }

  function onPointerMove(e: PointerEvent) {
    if (phase !== "dragging" || !gesture) return;
    const tx = gesture.onMove(e.clientX);
    translateX = tx;
    if (tx > 0) activeDirection = "right";
    else if (tx < 0) activeDirection = "left";
    else activeDirection = "none";
  }

  function onPointerUp(e: PointerEvent) {
    if (phase !== "dragging" || !gesture) return;
    gesture.onUp(e.clientX);
    gesture = null;
    // Tap and long-press don't trigger a rebound/commit animation; return to idle.
    if (phase === "dragging") phase = "idle";
  }

  function onPointerCancel() {
    if (phase !== "dragging" || !gesture) return;
    gesture.onCancel();
    gesture = null;
    if (phase === "dragging") phase = "idle";
  }

  // --- Commit / rebound animations (unchanged behavior from pre-gesture-state) ---

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

    phase = "flying";
    translateX = -(rowWidth + 50);

    setTimeout(() => {
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
        : pulsing
          ? "transform 120ms ease-out"
          : "none",
  );
</script>

<li bind:this={liEl} class="relative isolate rounded-md mb-2 last:mb-0">
  <!-- Done reveal background (left side, revealed by rightward swipe) -->
  <div
    class="absolute inset-0 bg-green-500 flex items-center pl-4 gap-2 rounded-md"
    class:z-10={activeDirection === "right"}
    class:opacity-0={activeDirection !== "right"}
    aria-hidden="true"
  >
    <Check size={20} class="text-white" />
    <span class="text-white text-sm font-semibold uppercase tracking-wider">{doneLabel}</span>
  </div>

  <!-- Delete reveal background (right side, revealed by leftward swipe) -->
  <div
    class="absolute inset-0 bg-destructive flex items-center justify-end pr-4 rounded-md"
    class:z-10={activeDirection === "left"}
    class:opacity-0={activeDirection !== "left"}
    aria-hidden="true"
  >
    <Trash2 size={20} class="text-white" />
  </div>

  <!-- Row content — slides left on swipe -->
  <div
    role="button"
    tabindex="0"
    class="relative z-20 flex items-start gap-2 py-2 px-4 rounded-md bg-card border border-border touch-pan-y select-none"
    style:transform={`translateX(${translateX}px) scale(${pulsing ? 0.98 : 1})`}
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
    {#if entry.warning === "partial-transcription"}
      <AlertTriangle
        size={16}
        class="shrink-0 mt-[3px] text-amber-500"
        aria-label="Partial transcription"
      />
    {/if}
    <span
      class="flex-auto text-base leading-[1.6] text-foreground break-words"
      class:line-through={entry.done}
      class:opacity-60={entry.done}
    >{entry.displayText}</span>
  </div>
</li>
