# PWA Setup

## Overview

Set up Drainiac as a Progressive Web App using SvelteKit. The app should be installable on mobile devices, work offline, and provide a native-like experience. This is the foundation all other features build on.

## Requirements

- Configure SvelteKit as a PWA with a web app manifest (`manifest.json`)
  - App name: Drainiac
  - Display mode: standalone
  - Theme colour and background colour aligned with the design system
  - App icons in required sizes
- Register a service worker for offline capability
  - Cache the app shell so it loads without a network connection
  - Show a fallback UI when offline and data is unavailable
- The app must be installable via the browser's "Add to Home Screen" prompt on mobile
- Responsive layout — mobile-first, but usable on tablet and desktop
- Single-page app feel with SvelteKit client-side routing

## References

- Project overview: `@context/project-overview.md` (Phase 1 scope)
