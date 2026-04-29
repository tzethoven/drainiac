import { describe, it, expect } from "vitest";
import { capturePolicy } from "./capture-policy";

const WITH_TEXT = "hello there";
const NO_TEXT = "";

describe("capturePolicy", () => {
  it("release with partial text: save, no warning, no toast", () => {
    expect(capturePolicy("release", WITH_TEXT)).toEqual({
      save: { warning: false },
      toastMessage: null,
    });
  });

  it("release with no text: no save, 'Didn't catch that' toast", () => {
    expect(capturePolicy("release", NO_TEXT)).toEqual({
      save: null,
      toastMessage: "Didn't catch that",
    });
  });

  it("no-speech (any partial text): no save, 'Didn't catch that' toast", () => {
    expect(capturePolicy("no-speech", WITH_TEXT)).toEqual({
      save: null,
      toastMessage: "Didn't catch that",
    });
    expect(capturePolicy("no-speech", NO_TEXT)).toEqual({
      save: null,
      toastMessage: "Didn't catch that",
    });
  });

  it("network + no partial: no save, network toast", () => {
    expect(capturePolicy("network", NO_TEXT)).toEqual({
      save: null,
      toastMessage: "Speech recognition needs a connection — try again",
    });
  });

  it("network + partial: save with warning, network toast", () => {
    expect(capturePolicy("network", WITH_TEXT)).toEqual({
      save: { warning: true },
      toastMessage: "Speech recognition needs a connection — try again",
    });
  });

  it("audio-capture + no partial: no save, mic toast", () => {
    expect(capturePolicy("audio-capture", NO_TEXT)).toEqual({
      save: null,
      toastMessage: "Microphone unavailable",
    });
  });

  it("audio-capture + partial: save with warning, mic toast", () => {
    expect(capturePolicy("audio-capture", WITH_TEXT)).toEqual({
      save: { warning: true },
      toastMessage: "Microphone unavailable",
    });
  });

  it("unknown + no partial: no save, generic toast", () => {
    expect(capturePolicy("unknown", NO_TEXT)).toEqual({
      save: null,
      toastMessage: "Something went wrong — try again",
    });
  });

  it("unknown + partial: save with warning, generic toast", () => {
    expect(capturePolicy("unknown", WITH_TEXT)).toEqual({
      save: { warning: true },
      toastMessage: "Something went wrong — try again",
    });
  });

  it("aborted + partial (external interruption): save WITHOUT warning, no toast", () => {
    expect(capturePolicy("aborted", WITH_TEXT)).toEqual({
      save: { warning: false },
      toastMessage: null,
    });
  });

  it("aborted + no partial: silent, no save, no toast", () => {
    expect(capturePolicy("aborted", NO_TEXT)).toEqual({
      save: null,
      toastMessage: null,
    });
  });

  it("permission-denied: no save, no toast (pane flips to explainer)", () => {
    expect(capturePolicy("permission-denied", WITH_TEXT)).toEqual({
      save: null,
      toastMessage: null,
    });
    expect(capturePolicy("permission-denied", NO_TEXT)).toEqual({
      save: null,
      toastMessage: null,
    });
  });
});
