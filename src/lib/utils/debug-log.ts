/**
 * Client-side debug logger that forwards messages to the dev server terminal
 * via `POST /api/debug-log`. No-op in production builds.
 *
 * Usage:
 *   import { debugLog } from "$lib/utils/debug-log";
 *   debugLog("speech:onresult", { resultIndex, length });
 *
 * Logs are also mirrored to the browser console so remote devtools still work.
 * Entries are batched on a short microtask flush to avoid flooding the
 * network with one request per call.
 */

type Level = "log" | "warn" | "error";

interface Entry {
  level: Level;
  tag?: string;
  args: unknown[];
}

const queue: Entry[] = [];
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    void flush();
  });
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const entries = queue.splice(0, queue.length).map((e) => ({
    level: e.level,
    tag: e.tag,
    args: e.args.map(safeSerialize),
  }));
  try {
    await fetch("/api/debug-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
      keepalive: true,
    });
  } catch {
    // Swallow — dev logging must never break the app.
  }
}

function safeSerialize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function enabled(): boolean {
  return (
    typeof import.meta !== "undefined" &&
    Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
  );
}

function emit(level: Level, tag: string | undefined, args: unknown[]): void {
  // Always mirror to the browser console.
  // eslint-disable-next-line no-console
  (console[level] ?? console.log)(tag ? `[${tag}]` : "", ...args);
  if (!enabled()) return;
  queue.push({ level, tag, args });
  scheduleFlush();
}

export function debugLog(tag: string, ...args: unknown[]): void {
  emit("log", tag, args);
}

export function debugWarn(tag: string, ...args: unknown[]): void {
  emit("warn", tag, args);
}

export function debugError(tag: string, ...args: unknown[]): void {
  emit("error", tag, args);
}
