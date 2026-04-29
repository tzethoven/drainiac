// Prerender the root at build time so the service worker can precache the
// app shell and offline cold-launch renders the UI instead of a 503.
// The app is fully client-driven (localStorage, Web Speech) so prerendering
// is semantically a no-op.
export const prerender = true;
