import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";

export const prerender = false;

/**
 * Dev-only sink that forwards client-side debug logs to the Vite dev server's
 * terminal. Gated to DEV via the client caller; the endpoint itself returns
 * 404 in production for safety.
 */
export const POST: RequestHandler = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response("Not found", { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const entries = Array.isArray((payload as { entries?: unknown })?.entries)
    ? (payload as { entries: unknown[] }).entries
    : [payload];

  for (const entry of entries) {
    const e = entry as { level?: string; tag?: string; args?: unknown[] };
    const level = e.level ?? "log";
    const tag = e.tag ? `[${e.tag}]` : "";
    const args = Array.isArray(e.args) ? e.args : [entry];
    // eslint-disable-next-line no-console
    (console[level as "log" | "warn" | "error"] ?? console.log)(
      `[client]${tag}`,
      ...args,
    );
  }

  return json({ ok: true });
};
