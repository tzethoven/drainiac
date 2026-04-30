<script lang="ts">
    import { createSpeechController } from "$lib/utils/speech-controller.svelte";
    import { parse } from "$lib/utils/transcript-parser";
    import { getEntriesContext } from "$lib/stores/entries-store.svelte";
    import { getToastContext } from "$lib/stores/toast-store.svelte";
    import { debugLog } from "$lib/utils/debug-log";
    import {
        capturePolicy,
        type CaptureEndReason,
    } from "./capture-policy";

    const controller = createSpeechController();
    const entriesStore = getEntriesContext();
    const toastStore = getToastContext();

    /** How long to keep the final transcript on screen after release (ms). */
    const FINAL_DISPLAY_MS = 3000;
    /** Vertical drag distance (px) that cancels the recording. */
    const CANCEL_DRAG_PX = 80;

    let isHolding = $state(false);
    let isCancelling = $state(false);
    let isFinalVisible = $state(false);
    let pointerStartY = 0;
    let activePointerId: number | null = null;
    /** Guards against double-processing (effect + endHold both firing for one session). */
    let sessionHandled = false;

    $effect(() => {
        if (!isFinalVisible) return;
        const t = setTimeout(() => { isFinalVisible = false; }, FINAL_DISPLAY_MS);
        return () => clearTimeout(t);
    });

    function currentPartial(): string {
        return (controller.finalText + controller.interimText).trim();
    }

    function applyPolicy(reason: CaptureEndReason, partial: string) {
        if (sessionHandled) return;
        sessionHandled = true;

        const result = capturePolicy(reason, partial);
        debugLog("capture:applyPolicy", { reason, partial, result });

        if (result.save) {
            const parsed = parse(partial);
            entriesStore.add({
                category: parsed.category,
                displayText: parsed.displayText,
                rawTranscript: parsed.rawTranscript,
                ...(result.save.warning
                    ? { warning: "partial-transcription" as const }
                    : {}),
            });
            isFinalVisible = true;
        }

        if (result.toastMessage) {
            toastStore.show(result.toastMessage);
        }
    }

    // Only apply policy via $effect when the user is NOT actively holding.
    // Handles the true-interruption path (permission-denied on page load,
    // state changes while the pointer event never arrives). During an active
    // hold, transient engine errors (no-speech from silence timeouts, spurious
    // aborted from the pre-warming respawn cycle) would otherwise prematurely
    // commit an incomplete partial and block the real save on release.
    $effect(() => {
        const s = controller.state;
        if (isHolding) return;
        if (s === "error" && controller.error) {
            applyPolicy(controller.error, currentPartial());
        } else if (s === "permission-denied") {
            applyPolicy("permission-denied", currentPartial());
        }
    });

    function beginHold(event: PointerEvent) {
        if (activePointerId !== null) return;
        if (
            controller.state === "unsupported" ||
            controller.state === "permission-denied"
        )
            return;
        event.preventDefault();
        activePointerId = event.pointerId;
        pointerStartY = event.clientY;
        isCancelling = false;
        isHolding = true;
        isFinalVisible = false;
        sessionHandled = false;
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        controller.start();
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
            controller.cancel();
            isCancelling = false;
            sessionHandled = true;
            isHolding = false;
            return;
        }

        // Capture reason BEFORE stop (error state may already be set mid-hold).
        const endState = controller.state;
        const errorCode = controller.error;

        // Wait for the engine to flush trailing final results. Web Speech API
        // delivers the last utterance's final onresult AFTER stop() is called
        // but BEFORE onend fires — reading synchronously drops the last word.
        await controller.stop();

        const partial = currentPartial();
        debugLog("capture:endHold", {
            partial,
            finalText: controller.finalText,
            interimText: controller.interimText,
            endState,
            errorCode,
        });

        let reason: CaptureEndReason;
        if (endState === "error" && errorCode) {
            reason = errorCode;
        } else if (endState === "permission-denied") {
            reason = "permission-denied";
        } else {
            reason = "release";
        }

        applyPolicy(reason, partial);
        isHolding = false;
    }

    function cancelHold(event: PointerEvent) {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        isCancelling = false;
        // pointercancel from OS interruption (phone call, tab switch) — case #4.
        // Save whatever we have; no warning (user was cut off, not a transcription fault).
        const partial = currentPartial();
        controller.cancel();
        if (partial.length > 0) {
            // Force-save path: bypass policy (cancel() discarded the transcript buffer).
            sessionHandled = true;
            const parsed = parse(partial);
            entriesStore.add({
                category: parsed.category,
                displayText: parsed.displayText,
                rawTranscript: parsed.rawTranscript,
            });
            isFinalVisible = true;
        } else {
            sessionHandled = true;
        }
        isHolding = false;
    }

    const liveTranscript = $derived(
        (controller.finalText + controller.interimText).trim(),
    );
</script>

{#if controller.state === "unsupported"}
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
{:else if controller.state === "permission-denied"}
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
            {#if isHolding && liveTranscript}
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
{/if}
