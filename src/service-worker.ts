/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `memento-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never let the SW handle auth / API traffic - these must hit the worker.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests (cold launch, reload) — first try to fetch, then use
  // cache as fallback. If cache not found, return a 503 error.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match("/")
          .then((cached) => cached ?? new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches
        .match(event.request)
        .then((cached) => cached ?? fetch(event.request)),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached ?? new Response("Offline", { status: 503 })),
      ),
  );
});
