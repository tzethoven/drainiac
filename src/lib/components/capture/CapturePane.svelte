<script lang="ts">
    import { createSpeechController } from "$lib/utils/speech-controller.svelte";

    const controller = createSpeechController();

    /** How long to keep the final transcript on screen after release (ms). */
    const FINAL_DISPLAY_MS = 3000;
    /** Vertical drag distance (px) that cancels the recording. */
    const CANCEL_DRAG_PX = 80;

    let isHolding = $state(false);
    let isCancelling = $state(false);
    let lastFinal = $state("");
    let isFinalVisible = $state(false);
    let finalTimeout: ReturnType<typeof setTimeout> | null = null;
    let pointerStartY = 0;
    let activePointerId: number | null = null;

    function clearFinalTimeout() {
        if (finalTimeout) {
            clearTimeout(finalTimeout);
            finalTimeout = null;
        }
    }

    function beginHold(event: PointerEvent) {
        if (activePointerId !== null) return;
        event.preventDefault();
        activePointerId = event.pointerId;
        pointerStartY = event.clientY;
        isCancelling = false;
        isHolding = true;
        clearFinalTimeout();
        isFinalVisible = false;
        lastFinal = "";
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
            lastFinal = committed;
            isFinalVisible = true;
            clearFinalTimeout();
            finalTimeout = setTimeout(() => {
                isFinalVisible = false;
            }, FINAL_DISPLAY_MS);
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

<div class="capture-pane">
    <div class="transcript-area" aria-live="polite">
        {#if controller.error}
            <p class="error">{controller.error}</p>
        {:else if isHolding && liveTranscript}
            <p class="live" class:cancelling={isCancelling}>{liveTranscript}</p>
        {:else if isFinalVisible}
            <p class="final">{lastFinal}</p>
        {:else if isHolding}
            <p class="hint">Listening…</p>
        {:else}
            <p class="hint muted">
                Hold the button and speak. Slide up to cancel.
            </p>
        {/if}
    </div>

    <button
        type="button"
        class="record-button"
        class:recording={isHolding}
        class:cancelling={isCancelling}
        aria-label="Hold to record"
        onpointerdown={beginHold}
        onpointermove={updateHold}
        onpointerup={endHold}
        onpointercancel={cancelHold}
        onpointerleave={(e) => {
            // Treat leaving the button while holding as continued hold; cancel only
            // triggers via the upward-drag threshold above.
            if (e.pointerId === activePointerId) updateHold(e);
        }}
    >
        <span class="dot"></span>
    </button>
</div>

<style>
    .capture-pane {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding: var(--spacing-xl);
        gap: var(--spacing-lg);
        pointer-events: none;
    }

    .transcript-area {
        width: min(100%, 32rem);
        min-height: 6rem;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        text-align: center;
        pointer-events: none;
    }

    .transcript-area p {
        margin: 0;
        font-size: var(--font-size-body);
        line-height: var(--line-height-normal);
    }

    .transcript-area .live {
        color: var(--foreground);
        font-size: var(--font-size-h3);
    }

    .transcript-area .live.cancelling {
        color: var(--destructive);
        text-decoration: line-through;
        opacity: 0.7;
    }

    .transcript-area .final {
        color: var(--foreground);
        font-size: var(--font-size-h3);
        opacity: 0.85;
    }

    .transcript-area .hint {
        color: var(--muted-foreground);
        font-size: var(--font-size-small);
    }

    .transcript-area .error {
        color: var(--destructive);
        font-size: var(--font-size-small);
    }

    .record-button {
        pointer-events: auto;
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        border: none;
        background: var(--primary);
        color: var(--primary-foreground);
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        cursor: pointer;
    }

    .record-button .dot {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        background: var(--primary-foreground);
        transition:
            transform var(--duration-fast) var(--ease-out),
            border-radius var(--duration-fast) var(--ease-out);
    }

    .record-button.recording {
        background: var(--destructive);
    }

    .record-button.recording .dot {
        border-radius: 0.25rem;
        transform: scale(0.8);
    }

    .record-button.cancelling {
        background: var(--muted);
        color: var(--muted-foreground);
    }

    .record-button:active:not(:disabled) {
        transform: none;
    }
</style>
