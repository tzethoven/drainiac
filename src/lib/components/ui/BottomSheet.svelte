<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { onDestroy, type Snippet } from "svelte";

  interface Props {
    open: boolean;
    onClose: () => void;
    /** id of an element inside `children` to use as the dialog's accessible name */
    labelledBy?: string;
    children: Snippet;
  }

  const { open, onClose, labelledBy, children }: Props = $props();

  // Focus restoration: capture the element that had focus when the sheet opened.
  let previouslyFocused: HTMLElement | null = null;
  let panelEl = $state<HTMLDivElement | undefined>(undefined);

  // --- Body scroll lock + Escape key + focus management ---

  // Track on-screen keyboard height via VisualViewport API as a fallback for
  // browsers that don't honor `interactive-widget=resizes-content`. When the
  // keyboard opens, visualViewport.height shrinks; the difference is the
  // keyboard's intrusion into the layout viewport, and we lift the panel by
  // that much so Save/Cancel stay visible.
  let keyboardInset = $state(0);

  $effect(() => {
    if (!open) return;
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      keyboardInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      keyboardInset = 0;
    };
  });

  $effect(() => {
    if (!open) return;

    // Capture focus source before we move it.
    previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;

    // Scroll lock.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape key.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Autofocus the first focusable element inside the panel.
    // Note: the consumer sheet is responsible for focusing its own primary
    // element (textarea, first button). We only fall back here if it didn't.
    requestAnimationFrame(() => {
      if (!panelEl) return;
      if (panelEl.contains(document.activeElement)) return;
      const first = panelEl.querySelector<HTMLElement>(
        'textarea, input, button, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger element.
      previouslyFocused?.focus?.();
      previouslyFocused = null;
    };
  });

  onDestroy(() => {
    // Safety net in case parent unmounts us while open.
    document.body.style.overflow = "";
  });

  // --- Swipe-down-to-dismiss on the drag handle ---
  const SWIPE_DISMISS_THRESHOLD = 80; // px

  let dragStartY = 0;
  let dragging = $state(false);
  let dragOffset = $state(0); // px downward; only > 0 tracked

  function onHandlePointerDown(e: PointerEvent) {
    dragStartY = e.clientY;
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dy = e.clientY - dragStartY;
    dragOffset = Math.max(0, dy);
  }

  function onHandlePointerUp() {
    if (!dragging) return;
    const committed = dragOffset >= SWIPE_DISMISS_THRESHOLD;
    dragging = false;
    dragOffset = 0;
    if (committed) onClose();
  }

  function onHandlePointerCancel() {
    dragging = false;
    dragOffset = 0;
  }
</script>

{#if open}
  <!-- Backdrop -->
  <!--
    Using pointerdown (not click) to avoid the Chrome Android "ghost click":
    after the tap on the row, a synthetic click fires ~300ms later at the
    same coords, which by then land on this backdrop and would dismiss the
    sheet immediately. Synthetic clicks do not re-dispatch pointerdown.
  -->
  <div
    role="presentation"
    class="fixed inset-0 z-40 bg-black/50"
    transition:fade={{ duration: 180 }}
    onpointerdown={onClose}
  ></div>

  <!-- Panel -->
  <div
    bind:this={panelEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledBy}
    class="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-card border-t border-border shadow-2xl pb-[env(safe-area-inset-bottom)]"
    style:transform={dragging
      ? `translateY(${dragOffset}px)`
      : keyboardInset > 0
        ? `translateY(-${keyboardInset}px)`
        : undefined}
    style:transition={dragging ? "none" : "transform 180ms ease-out"}
    in:fly={{ y: 400, duration: 220 }}
    out:fly={{ y: 400, duration: 180 }}
  >
    <!-- Drag handle -->
    <div
      class="flex justify-center pt-2 pb-1 touch-none cursor-grab active:cursor-grabbing"
      onpointerdown={onHandlePointerDown}
      onpointermove={onHandlePointerMove}
      onpointerup={onHandlePointerUp}
      onpointercancel={onHandlePointerCancel}
      aria-hidden="true"
    >
      <div class="w-9 h-1 rounded-full bg-muted-foreground/40"></div>
    </div>

    {@render children()}
  </div>
{/if}
