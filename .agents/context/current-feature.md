# Current Feature

## Status

In Review

## Goals

## Notes

## History

### Code Word Detection & Categorization - Completed 2026-04-12
- Detect code words (Todo, Read, Watch, Note, Idea, Habit) at start of transcriptions
- Auto-categorize transcriptions based on detected code word
- Remove code word from stored text ("Todo buy milk" → category: "todo", text: "buy milk")
- Visual category badges with color coding + icons on transcription items
- Category filtering with tabs (All, Todo, Read, Watch, Note, Idea, Habit)
- Item counts in category tabs
- Backward compatible with existing uncategorized transcriptions
- Edge cases: empty text after code word removal, unknown words, code word only
- Files: `src/lib/types/transcription.ts`, `src/lib/utils/transcription-store.svelte.ts`, `src/routes/+page.svelte`

### Voice Capture (Phase 1) - Completed 2026-04-12
- Implemented hold-to-record button with visual feedback
- Real-time transcription using Web Speech API (interim + final results)
- localStorage persistence with transcription history
- Delete individual transcriptions
- Browser support detection and error handling
- Files: `src/routes/+page.svelte`, `src/lib/utils/speech-recognition.svelte.ts`, `src/lib/utils/transcription-store.svelte.ts`

### PWA Setup (Phase 1) - Completed 2026-04-12
- Progressive Web App configuration
- Web app manifest with theme colors and icons
- Service worker for offline support and caching
- Installable on mobile devices
- Files: `src/service-worker.ts`, `static/manifest.json`, `static/icons/`, `src/app.html`

### Todo List Manager - Completed 2026-04-12
- Built dedicated `/todos` page with full CRUD operations for managing captured todos. Users can now mark todos complete/incomplete, edit text inline with explicit Save/Cancel buttons, delete with confirmation, and archive to hide from main view. Added todo-specific metadata including status (pending/complete), optional priority levels (low/medium/high), and optional due dates with overdue warnings. Implemented filter tabs (All/Active/Complete) with live counts and a manual todo entry form for direct input. Voice-captured todos using "to do" code word automatically sync to the todo list via dual-write pattern with error handling. Extracted shared localStorage utility (`local-storage.ts`) to eliminate duplication between transcription and todo stores. This completes the "capture fast, process later" workflow for todos by enabling users to act on captured tasks.

### Reading & Watch Lists - Completed 2026-04-12
- Built dedicated `/reading` and `/watching` pages with status workflow (Queued → In Progress → Completed). Implemented "What's Next?" picker that shows 3 random queued items with shuffle option, reducing decision fatigue when choosing what to consume. Users can add items manually or via voice capture ("Read"/"Watch" code words auto-sync via dual-write). Full CRUD operations: inline edit (with Save/Cancel buttons), delete with confirmation, archive to hide from main list. Added type selectors (Book/Article for reading, Film/Series/Video for watching), optional post-completion 5-star rating, and XP calculation (+10 to +50 based on type, +5 bonus if completed within 24hrs). Filter tabs (All/Queued/In Progress/Completed) with live counts. Extracted generic `createMediaStore` to eliminate 95% code duplication between reading/watch stores (~180 lines each reduced to ~30 lines). Auto-migrates existing read/watch transcriptions on first load. XP values centralized in constants. Documented deferred features (metadata editing UI, XP celebration animation) in `docs/future-enhancements.md`.

### UI Design System (Phase 1) - Completed 2026-04-12
- Established comprehensive design system with CSS variables for spacing (8px scale: xs/sm/md/lg/xl/2xl), typography (Geist font, H1-H3 sizes, line heights), shadows (3 elevation levels), and animation timing (instant/fast/normal/slow durations with ease-in/out/in-out functions). Implemented dark mode with ThemeToggle component (sun/moon icons) on all pages, persists preference to localStorage, respects system `prefers-color-scheme`. Added smooth animations throughout: page transitions (fade in 300ms on mount), list items (slide in/out animations), modals (scale + fade backdrop for pickers/dialogs), button press feedback (scale to 0.98 on active). Applied theme-aware colors using CSS variables (border-border, bg-card, text-foreground, etc.) replacing all hardcoded colors for light/dark mode compatibility. Added `prefers-reduced-motion` media query to respect accessibility preferences. Created custom animation utilities (fade-in, slide-up, scale-in) for future use. Updated all 4 pages (home, todos, reading, watching) with consistent styling and smooth interactions. Note: Progress indicators (todo completion %, XP bar, streak indicators) and todo completion celebrations deferred to future enhancement as they require gamification system integration. Files: `src/app.css`, `src/lib/components/ThemeToggle.svelte`, `src/lib/utils/theme-store.svelte.ts`, all page components.
