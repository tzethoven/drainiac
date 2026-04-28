export type Category = "todo" | "note" | "idea";

export interface ParsedEntry {
  category: Category;
  displayText: string;
  rawTranscript: string;
}

const SINGLE_WORD_TRIGGERS: Record<string, Category> = {
  todo: "todo",
  "to-do": "todo",
  task: "todo",
  note: "note",
  notes: "note",
  idea: "idea",
  ideas: "idea",
  id: "idea",
};

interface TriggerMatch {
  category: Category;
  body: string;
}

function matchTrigger(input: string): TriggerMatch | null {
  // Strip leading whitespace and punctuation (anything that isn't a letter,
  // digit, or hyphen) so we tolerate noisy Web Speech output like ",todo ...".
  const normalized = input.replace(/^[^\p{L}\p{N}-]+/u, "");
  const tokens = normalized.split(/\s+/);
  const [firstRaw = "", secondRaw, ...rest] = tokens;
  const first = firstRaw.toLowerCase();
  const second = secondRaw?.toLowerCase();

  // Two-word trigger: "to do"
  if (first === "to" && second === "do") {
    return { category: "todo", body: rest.join(" ") };
  }

  const category = SINGLE_WORD_TRIGGERS[first];
  if (category) {
    return { category, body: tokens.slice(1).join(" ") };
  }
  return null;
}

export function parse(raw: string): ParsedEntry {
  const match = matchTrigger(raw);
  const category = match?.category ?? "note";
  const body = match?.body ?? raw;
  return {
    category,
    displayText: cleanBody(body),
    rawTranscript: raw,
  };
}

function cleanBody(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return "";
  const capitalized = collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}
