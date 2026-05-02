import { describe, it, expect } from "vitest";
import { group } from "./day-grouper";
import type { Entry } from "$lib/stores/entries-store.svelte";

function entry(partial: Partial<Entry> & { id: string; createdAt: number }): Entry {
  return {
    id: partial.id,
    schemaVersion: 2,
    category: partial.category ?? "note",
    displayText: partial.displayText ?? "x",
    rawTranscript: partial.rawTranscript ?? "x",
    source: "voice",
    done: partial.done ?? false,
    createdAt: partial.createdAt,
    updatedAt: partial.createdAt,
    polishedText: null,
    polishedAt: null,
    polishedModel: null,
    polishedPromptVersion: null,
  };
}

// Reference "now": Tue 28 Apr 2026, 10:00 local time.
const NOW = new Date(2026, 3, 28, 10, 0, 0).getTime();

describe("day-grouper", () => {
  it("returns an empty section list for no entries", () => {
    expect(group([], NOW)).toEqual([]);
  });

  it("groups an entry from the same local day under 'Today'", () => {
    const e = entry({ id: "a", createdAt: new Date(2026, 3, 28, 9, 0).getTime() });
    const sections = group([e], NOW);

    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe("today");
    expect(sections[0].label).toBe("Today");
    expect(sections[0].entries).toEqual([e]);
  });

  it("groups an entry from the previous local day under 'Yesterday'", () => {
    const e = entry({ id: "a", createdAt: new Date(2026, 3, 27, 15, 0).getTime() });
    const sections = group([e], NOW);

    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe("yesterday");
    expect(sections[0].label).toBe("Yesterday");
  });

  it("handles the midnight boundary: 23:59 prior day is 'Yesterday', 00:01 today is 'Today'", () => {
    const prior = entry({ id: "p", createdAt: new Date(2026, 3, 27, 23, 59).getTime() });
    const early = entry({ id: "e", createdAt: new Date(2026, 3, 28, 0, 1).getTime() });
    const sections = group([prior, early], NOW);

    const today = sections.find((s) => s.kind === "today");
    const yest = sections.find((s) => s.kind === "yesterday");
    expect(today?.entries.map((x) => x.id)).toEqual(["e"]);
    expect(yest?.entries.map((x) => x.id)).toEqual(["p"]);
  });

  it("labels entries 2-6 days ago with their weekday name (en-GB)", () => {
    // NOW is Tue 28 Apr 2026. 2 days ago = Sun 26 Apr, 6 days ago = Wed 22 Apr.
    const twoAgo = entry({ id: "a", createdAt: new Date(2026, 3, 26, 12, 0).getTime() }); // Sunday
    const sixAgo = entry({ id: "b", createdAt: new Date(2026, 3, 22, 12, 0).getTime() }); // Wednesday
    const sections = group([twoAgo, sixAgo], NOW);

    const sun = sections.find((s) => s.entries.some((e) => e.id === "a"));
    const wed = sections.find((s) => s.entries.some((e) => e.id === "b"));
    expect(sun?.kind).toBe("weekday");
    expect(sun?.label).toBe("Sunday");
    expect(wed?.kind).toBe("weekday");
    expect(wed?.label).toBe("Wednesday");
  });

  it("labels entries 7+ days ago in the current year as 'DD Mon' (en-GB)", () => {
    // 7 days before 28 Apr 2026 = 21 Apr 2026.
    const e = entry({ id: "a", createdAt: new Date(2026, 3, 21, 12, 0).getTime() });
    const sections = group([e], NOW);

    expect(sections[0].kind).toBe("date");
    expect(sections[0].label).toBe("21 Apr");
  });

  it("labels entries from a prior year as 'DD Mon YYYY' (en-GB)", () => {
    const e = entry({ id: "a", createdAt: new Date(2024, 0, 15, 12, 0).getTime() });
    const sections = group([e], NOW);

    expect(sections[0].kind).toBe("date");
    expect(sections[0].label).toBe("15 Jan 2024");
  });

  it("orders sections newest-first", () => {
    const today = entry({ id: "t", createdAt: new Date(2026, 3, 28, 9, 0).getTime() });
    const yest = entry({ id: "y", createdAt: new Date(2026, 3, 27, 9, 0).getTime() });
    const older = entry({ id: "o", createdAt: new Date(2024, 0, 15, 9, 0).getTime() });
    // Feed in deliberately scrambled order.
    const sections = group([older, today, yest], NOW);

    expect(sections.map((s) => s.kind)).toEqual(["today", "yesterday", "date"]);
  });

  it("orders entries within a section newest-first", () => {
    const earlier = entry({ id: "a", createdAt: new Date(2026, 3, 28, 8, 0).getTime() });
    const later = entry({ id: "b", createdAt: new Date(2026, 3, 28, 9, 30).getTime() });
    const sections = group([earlier, later], NOW);

    expect(sections).toHaveLength(1);
    expect(sections[0].entries.map((e) => e.id)).toEqual(["b", "a"]);
  });
});
