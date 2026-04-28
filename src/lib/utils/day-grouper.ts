import type { Entry } from "$lib/stores/entries-store.svelte";

export type SectionKind = "today" | "yesterday" | "weekday" | "date";

export interface Section {
  kind: SectionKind;
  label: string;
  key: string;
  entries: Entry[];
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function localDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MS_PER_DAY = 86_400_000;

function dayOffsetFromToday(entryMs: number, nowMs: number): number {
  return Math.round(
    (startOfLocalDay(nowMs) - startOfLocalDay(entryMs)) / MS_PER_DAY,
  );
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const DATE_FMT_CURRENT_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
const DATE_FMT_WITH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function labelFor(kind: SectionKind, entryMs: number, nowMs: number): string {
  switch (kind) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "weekday":
      return WEEKDAY_FMT.format(new Date(entryMs));
    case "date": {
      const sameYear =
        new Date(entryMs).getFullYear() === new Date(nowMs).getFullYear();
      return (sameYear ? DATE_FMT_CURRENT_YEAR : DATE_FMT_WITH_YEAR).format(
        new Date(entryMs),
      );
    }
  }
}

function kindFor(offset: number): SectionKind {
  if (offset === 0) return "today";
  if (offset === 1) return "yesterday";
  if (offset >= 2 && offset <= 6) return "weekday";
  return "date";
}

export function group(entries: Entry[], now: number): Section[] {
  if (entries.length === 0) return [];

  const buckets = new Map<string, { offset: number; entries: Entry[] }>();
  for (const e of entries) {
    const key = localDateKey(e.createdAt);
    const existing = buckets.get(key);
    if (existing) existing.entries.push(e);
    else buckets.set(key, { offset: dayOffsetFromToday(e.createdAt, now), entries: [e] });
  }

  const sections: Section[] = [];
  for (const [key, { offset, entries: es }] of buckets) {
    es.sort((a, b) => b.createdAt - a.createdAt);
    const kind = kindFor(offset);
    sections.push({ kind, label: labelFor(kind, es[0].createdAt, now), key, entries: es });
  }
  sections.sort((a, b) => b.entries[0].createdAt - a.entries[0].createdAt);
  return sections;
}
