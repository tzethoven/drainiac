# Progressive Web App Setup — Feature Specification

## Overview

Configure Drainiac as a Progressive Web App (PWA) to enable installation on mobile and desktop devices, offline functionality, and native-like experience while remaining web-based.

## Requirements

### Functional Requirements

1. **Web App Manifest**
   - Configure `manifest.json` with app metadata:
     - App name: "Drainiac"
     - Short name: "Drainiac"
     - Description
     - Theme colors
     - Background color
     - Display mode: standalone
     - Orientation: portrait-primary (mobile), any (desktop)
     - Start URL
     - Scope
   - App icons in multiple sizes (192x192, 512x512, maskable)
   - Screenshots for app stores (optional)
   - Share target configuration (future consideration)

2. **Service Worker**
   - Register service worker
   - Cache strategies:
     - Cache-first for static assets (HTML, CSS, JS, fonts, icons)
     - Network-first for API calls with cache fallback
     - Stale-while-revalidate for images
   - Offline fallback page
   - Background sync for queued operations
   - Version management and updates
   - Clean up old caches

3. **Offline Functionality**
   - Core app shell cached
   - All reading functionality works offline
   - Capture and queue new entries offline
   - Sync queued entries when online
   - Clear offline status indicator
   - Handle offline/online transitions gracefully

4. **Installation**
   - Detect installation capability
   - Custom install prompt/button
   - Track installation state
   - Hide install prompt after installation
   - Welcome screen on first launch after install

5. **Updates & Versioning**
   - Notify users when update is available
   - Prompt to reload for new version
   - Skip waiting strategy or user-controlled
   - Version display in settings
   - Changelog access (optional)

6. **Push Notifications** (future consideration)
   - Register for push notifications
   - Handle notification permissions
   - Background notification handling
   - Notification click actions
   - Reminder system integration

### Non-Functional Requirements

1. **Performance**
   - Lighthouse PWA score > 90
   - Fast initial load (< 3s on 3G)
   - Instant navigation after cached
   - Minimal service worker overhead

2. **User Experience**
   - Seamless offline transition
   - No jarring "offline" errors
   - Clear sync status
   - Native app feel
   - Appropriate splash screen

3. **Compatibility**
   - Works on Chrome/Edge/Safari (iOS/Android)
   - Graceful degradation on unsupported browsers
   - Test on multiple devices and screen sizes
   - Handle iOS-specific PWA quirks

4. **Storage Management**
   - Monitor cache size
   - Clear old cached data
   - Handle quota exceeded errors
   - User control over cache clearing

5. **Security**
   - HTTPS required
   - Secure service worker scope
   - Content Security Policy headers
   - No sensitive data in cache (or encrypted)

## References

- PWA documentation: https://web.dev/progressive-web-apps/
- Web App Manifest: https://developer.mozilla.org/en-US/docs/Web/Manifest
- Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- Workbox (service worker library): https://developers.google.com/web/tools/workbox
- SvelteKit PWA integration
- Related specs: `authentication-spec.md`, `data-storage-spec.md`, `voice-capture-spec.md`
