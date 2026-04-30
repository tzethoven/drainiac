import type { SpeechErrorCode } from "$lib/utils/speech-controller";

/** All reasons a recording session can terminate. Drives `capturePolicy`. */
export type CaptureEndReason =
  | "release" // pointer release, no error (happy path)
  | SpeechErrorCode // transient runtime error
  | "permission-denied"; // sticky capability denial

/**
 * Outcome of the policy lookup. Discriminated on `save`:
 *   - `{ save: true, warning, toast }`  → create an Entry; `warning` flags
 *     partial transcription; `toast` (if non-null) is also shown.
 *   - `{ save: false, toast }`          → do not create an Entry; `toast`
 *     (if non-null) is shown.
 *
 * Save-decision and toast-presence are orthogonal in the table; this shape
 * keeps them so and lets the type system forbid reading `warning` on a
 * discard.
 */
export type CapturePolicyResult =
  | { save: true; warning: boolean; toast: string | null }
  | { save: false; toast: string | null };

const TOAST_DIDNT_CATCH = "Didn't catch that";
const TOAST_NETWORK = "Speech recognition needs a connection — try again";
const TOAST_MIC = "Microphone unavailable";
const TOAST_GENERIC = "Something went wrong — try again";

/**
 * Pure function mapping `(endReason, partialText)` → outcome. Encodes the
 * 13-row policy table from issue #08. Stateless and side-effect-free;
 * exhaustive over `CaptureEndReason` by the compiler.
 */
export function capturePolicy(
  endReason: CaptureEndReason,
  partialText: string,
): CapturePolicyResult {
  const hasPartial = partialText.length > 0;

  switch (endReason) {
    case "release":
      return hasPartial
        ? { save: true, warning: false, toast: null }
        : { save: false, toast: TOAST_DIDNT_CATCH };

    case "no-speech":
      return { save: false, toast: TOAST_DIDNT_CATCH };

    case "network":
      return hasPartial
        ? { save: true, warning: true, toast: TOAST_NETWORK }
        : { save: false, toast: TOAST_NETWORK };

    case "audio-capture":
      return hasPartial
        ? { save: true, warning: true, toast: TOAST_MIC }
        : { save: false, toast: TOAST_MIC };

    case "unknown":
      return hasPartial
        ? { save: true, warning: true, toast: TOAST_GENERIC }
        : { save: false, toast: TOAST_GENERIC };

    case "aborted":
      // External interruption (tab switch, phone call). Save partial without
      // warning — user's thought was cut short, not the transcription's fault.
      return hasPartial
        ? { save: true, warning: false, toast: null }
        : { save: false, toast: null };

    case "permission-denied":
      // Pane flips to sticky explainer; no entry, no toast.
      return { save: false, toast: null };
  }
}
