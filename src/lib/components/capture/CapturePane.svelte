<script lang="ts">
    import { createSpeechController } from "$lib/utils/speech-controller.svelte";
    import { parse } from "$lib/utils/transcript-parser";
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";

    const controller = createSpeechController();
    const entriesStore = getEntriesContext();

    /** How long to keep the final transcript on screen after release (ms). */
    const FINAL_DISPLAY_MS = 3000;
    /** Vertical drag distance (px) that cancels the recording. */
    const CANCEL_DRAG_PX = 80;

    let isHolding = $state(false);
    let isCancelling = $state(false);
    let isFinalVisible = $state(false);
    let pointerStartY = 0;
    let activePointerId: number | null = null;

    $effect(() => {
        if (!isFinalVisible) return;
        const t = setTimeout(() => { isFinalVisible = false; }, FINAL_DISPLAY_MS);
        return () => clearTimeout(t);
    });

    function beginHold(event: PointerEvent) {
        if (activePointerId !== null) return;
        event.preventDefault();
        activePointerId = event.pointerId;
        pointerStartY = event.clientY;
        isCancelling = false;
        isHolding = true;
        isFinalVisible = false;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        controller.start();
    }

    function updateHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        const dy = pointerStartY - event.clientY;
        isCancelling = dy > CANCEL_DRAG_PX;
    }

    function endHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        isHolding = false;

        if (isCancelling) {
            controller.cancel();
            isCancelling = false;
            return;
        }

        const committed = (
            controller.finalText + controller.interimText
        ).trim();
        controller.stop();
        if (committed.length > 0) {
            const parsed = parse(committed);
            entriesStore.add({
                category: parsed.category,
                displayText: parsed.displayText,
                rawTranscript: parsed.rawTranscript,
            });
            isFinalVisible = true;
        }
    }

    function cancelHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        isHolding = false;
        isCancelling = false;
        controller.cancel();
    }

    const liveTranscript = $derived(
        (controller.finalText + controller.interimText).trim(),
    );
</script>

<div
    class="h-full flex flex-col justify-end items-center gap-6 pointer-events-none"
>
    <div
        class="w-[min(100%,32rem)] min-h-24 flex items-end justify-center text-center pointer-events-none"
        aria-live="polite"
    >
        {#if controller.error}
            <p class="m-0 text-sm leading-[1.6] text-destructive">
                {controller.error}
            </p>
        {:else if isHolding && liveTranscript}
            <p
                class="m-0 text-lg leading-[1.6] {isCancelling
                    ? 'text-destructive line-through opacity-70'
                    : 'text-foreground'}"
            >
                {liveTranscript}
            </p>
        {:else if isFinalVisible}
            <p class="m-0 text-lg leading-[1.6] text-foreground opacity-[0.85]">
                {controller.finalText}
            </p>
        {:else if isHolding}
            <p class="m-0 text-sm leading-[1.6] text-muted-foreground">
                Listening…
            </p>
        {:else}
            <p class="m-0 text-sm leading-[1.6] text-muted-foreground">
                Hold the button and speak. Slide up to cancel.
            </p>
        {/if}
    </div>

    <button
        type="button"
        class="pointer-events-auto w-20 h-20 rounded-full border-0 shadow-lg flex items-center justify-center touch-none select-none cursor-pointer active:scale-100 [-webkit-tap-highlight-color:transparent] {isCancelling
            ? 'bg-muted text-muted-foreground'
            : isHolding
              ? 'bg-destructive text-primary-foreground'
              : 'bg-primary text-primary-foreground'}"
        aria-label="Hold to record"
        onpointerdown={beginHold}
        onpointermove={updateHold}
        onpointerup={endHold}
        onpointercancel={cancelHold}
        onpointerleave={(e) => {
            if (e.pointerId === activePointerId) updateHold(e);
        }}
    >
        <span
            class="w-6 h-6 bg-primary-foreground transition-[transform,border-radius] duration-200 ease-out {isHolding
                ? 'rounded-[0.25rem] scale-[0.8]'
                : 'rounded-full'}"
        ></span>
    </button>
</div>
