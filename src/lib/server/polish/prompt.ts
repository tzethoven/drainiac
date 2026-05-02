/**
 * Polish prompt builder — pure, no I/O.
 *
 * One template, one set of hard rules shared across categories, with a
 * category-specific "latitude" block interpolated. Returns `{system,
 * user, config}` for a Gemini `generateContent` call. `config` pins
 * the sampling / output shape.
 *
 * When the prompt text changes in a user-visible way, bump
 * `PROMPT_VERSION`. Entries store this version alongside the polished
 * text so future reprocessing can tell old polishes from new.
 */

import type { Category } from "$lib/utils/transcript-parser";

export const PROMPT_VERSION = 1;

/** JSON schema the model must obey. */
export interface PolishResponseSchema {
  polished: string;
}

export interface PolishPromptConfig {
  temperature: number;
  maxOutputTokens: number;
  responseMimeType: "application/json";
  responseSchema: {
    type: "object";
    properties: { polished: { type: "string" } };
    required: ["polished"];
  };
}

export interface PolishPrompt {
  system: string;
  user: string;
  config: PolishPromptConfig;
}

const HARD_RULES = [
  "Preserve meaning. Do not add information that isn't in the input.",
  "Preserve the original language; translate nothing.",
  "Preserve proper nouns, numbers, and dates verbatim.",
  "No markdown, bullets, or emoji — plain text only.",
  "Output should ideally be shorter than the input and never more than 1.2× the input length.",
  "If the input is already clean, return it unchanged.",
  "If the input is unintelligible, return it unchanged.",
].join("\n- ");

const LATITUDE: Record<Category, string> = {
  todo:
    "This is a TODO. Fix spelling and grammar only. Keep wording and length as close to the original as possible.",
  note:
    "This is a NOTE. Fix spelling and grammar. Lightly restructure for readability. Do not summarise.",
  idea:
    "This is an IDEA. Fix spelling and grammar. You may condense and rephrase to express the core in one or two clear sentences. Never invent specifics.",
};

export function buildPolishPrompt(
  category: Category,
  rawTranscript: string,
): PolishPrompt {
  const system = [
    "You polish raw voice-transcribed thoughts into clean text for later review.",
    "",
    "Rules:",
    `- ${HARD_RULES}`,
    "",
    "Category-specific latitude:",
    LATITUDE[category],
    "",
    'Return JSON of shape {"polished": string}.',
  ].join("\n");

  const user = rawTranscript;

  const config: PolishPromptConfig = {
    temperature: 0.2,
    maxOutputTokens: 1024,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: { polished: { type: "string" } },
      required: ["polished"],
    },
  };

  return { system, user, config };
}
