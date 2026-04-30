<script lang="ts">
    import { createSpeechController } from "$lib/utils/speech-controller";
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";
    import { getToastContext } from "$lib/stores/toast-store.svelte";
    import { createCaptureSession } from "./capture-session.svelte";

    const controller = createSpeechController();
    const session = createCaptureSession({
        controller,
        entriesStore: getEntriesContext(),
        toastStore: getToastContext(),
    });

    /** Vertical drag distance (px) that cancels the recording. */
    const CANCEL_DRAG_PX = 80;

    // Pointer geometry only. Session owns everything else.
    let pointerStartY = 0;
    let activePointerId: number | null = null;
    let isCancelling = $state(false);

    function beginHold(event: PointerEvent) {
        if (activePointerId !== null) return;
        if (!controller.isSupported || session.phase === "denied") return;
        event.preventDefault();
        activePointerId = event.pointerId;
        pointerStartY = event.clientY;
        isCancelling = false;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        session.holdStart();
    }

    function updateHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        const dy = pointerStartY - event.clientY;
        isCancelling = dy > CANCEL_DRAG_PX;
    }

    async function endHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;

        if (isCancelling) {
            isCancelling = false;
            session.holdSlideCancel();
            return;
        }

        await session.holdRelease();
    }

    function cancelHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        isCancelling = false;
        session.pointerInterrupted();
    }

    const isHolding = $derived(session.phase === "recording");
    const isFinalVisible = $derived(session.phase === "saved-visible");
</script>

{#if !controller.isSupported}
    <div class="h-full flex flex-col justify-center items-center px-6 text-center gap-3">
        <h2 class="text-lg font-semibold text-foreground">
            Speech recognition isn't supported here
        </h2>
        <p class="text-sm text-muted-foreground leading-[1.6] max-w-sm">
            Memento needs the Web Speech API. Try one of these browsers:
        </p>
        <ul class="text-sm text-muted-foreground leading-[1.8] list-disc list-inside">
            <li>Chrome on Android</li>
            <li>Safari on iOS</li>
            <li>Chrome or Edge on desktop</li>
        </ul>
    </div>
{:else if session.phase === "denied"}
    <div class="h-full flex flex-col justify-center items-center px-6 text-center gap-4">
        <h2 class="text-lg font-semibold text-foreground">
            Microphone access is blocked
        </h2>
        <p class="text-sm text-muted-foreground leading-[1.6] max-w-sm">
            Memento can't record without microphone permission. Re-enable it in your browser settings, then reload the page.
        </p>
        <div class="text-sm text-muted-foreground leading-[1.6] max-w-sm text-left space-y-3">
            <div>
                <p class="font-semibold text-foreground">On iOS Safari</p>
                <p>Settings → Safari → Microphone → allow for this site. Or tap the "AA" button in the address bar → Website Settings → Microphone.</p>
            </div>
            <div>
                <p class="font-semibold text-foreground">On Chrome / Edge</p>
                <p>Tap the lock / tune icon in the address bar → Site settings → Microphone → Allow.</p>
            </div>
        </div>
        <button
            type="button"
            class="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            onclick={() => window.location.reload()}
        >
            Reload page
        </button>
    </div>
{:else}
    <div
        class="h-full flex flex-col justify-end items-center gap-6 pb-20 pointer-events-none"
    >
        <div
            class="w-[min(100%,32rem)] min-h-24 flex items-end justify-center text-center pointer-events-none"
            aria-live="polite"
        >
            {#if isHolding && session.liveTranscript}
                <p
                    class="m-0 text-lg leading-[1.6] {isCancelling
                        ? 'text-destructive line-through opacity-70'
                        : 'text-foreground'}"
                >
                    {session.liveTranscript}
                </p>
            {:else if isFinalVisible && session.finalDisplayText}
                <p class="m-0 text-lg leading-[1.6] text-foreground opacity-[0.85]">
                    {session.finalDisplayText}
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
{/if}
