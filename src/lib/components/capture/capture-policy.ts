import type { SpeechErrorCode } from "$lib/utils/speech-controller.svelte";

/** All reasons a recording session can terminate. Drives `capturePolicy`. */
export type CaptureEndReason =
  | "release" // pointer release, no error (happy path)
  | SpeechErrorCode // transient runtime error
  | "permission-denied"; // sticky capability denial

export interface CapturePolicyResult {
  /** `null` = do not create an entry. Object = create entry; `warning` marks partial transcription. */
  save: { warning: boolean } | null;
  /** `null` = no toast; string = toast message. */
  toastMessage: string | null;
}

const TOAST_DIDNT_CATCH = "Didn't catch that";
const TOAST_NETWORK = "Speech recognition needs a connection — try again";
const TOAST_MIC = "Microphone unavailable";
const TOAST_GENERIC = "Something went wrong — try again";

/**
 * Pure function mapping `(endReason, partialText)` → `(save?, toastMessage?)`.
 * Encodes the 13-row policy table from issue #08. Stateless and side-effect-free.
 */
export function capturePolicy(
  endReason: CaptureEndReason,
  partialText: string,
): CapturePolicyResult {
  const hasPartial = partialText.length > 0;

  switch (endReason) {
    case "release":
      return hasPartial
        ? { save: { warning: false }, toastMessage: null }
        : { save: null, toastMessage: TOAST_DIDNT_CATCH };

    case "no-speech":
      return { save: null, toastMessage: TOAST_DIDNT_CATCH };

    case "network":
      return {
        save: hasPartial ? { warning: true } : null,
        toastMessage: TOAST_NETWORK,
      };

    case "audio-capture":
      return {
        save: hasPartial ? { warning: true } : null,
        toastMessage: TOAST_MIC,
      };

    case "unknown":
      return {
        save: hasPartial ? { warning: true } : null,
        toastMessage: TOAST_GENERIC,
      };

    case "aborted":
      // External interruption (tab switch, phone call). Save partial without
      // warning — user's thought was cut short, not the transcription's fault.
      return {
        save: hasPartial ? { warning: false } : null,
        toastMessage: null,
      };

    case "permission-denied":
      // Pane flips to sticky explainer; no entry, no toast.
      return { save: null, toastMessage: null };
  }
}
