# Current Feature: Search & Filter

## Status

In Progress

## Goals

- Implement global search across all content types (todos, transcriptions, reading, watching, notes, ideas)
- Support full-text search with keyword matching (case-insensitive, partial word matching)
- Filter by category, status, date range, tags
- Quick filter: Processed vs Unprocessed items
- Display search results in unified view with context (type badge, title, status, timestamp)
- Fast, client-side search (no backend required for Phase 1)
- Keyboard shortcut for quick search access (Cmd/Ctrl + K)
- Search history (optional)
- Highlight search terms in results
- Empty state handling with helpful suggestions

## Notes

- **Priority:** Low
- **Scope:** Client-side search only, no backend or external search service
- **Dependencies:** All content types (Todos, Transcriptions, Reading/Watch Lists)
- **Search Logic:** Simple string matching for Phase 1, optional Fuse.js/Lunr.js for advanced fuzzy search
- **Performance:** Client-side sufficient for Phase 1, consider indexing/pagination for 10k+ items
- **Keyboard Shortcuts:** Cmd/Ctrl+K to open, Esc to close, Arrow keys to navigate, Enter to open result
- **Processed Definition:**
  - Todos: Complete or archived
  - Read/Watch: In-progress or completed
  - Transcriptions: Deleted or categorized
- **Unprocessed Definition:**
  - Todos: Pending
  - Read/Watch: Queued
  - Transcriptions: Uncategorized
- **Search Index:** Build in-memory SearchableItem[] on app load with id, type, title, content, category, status, tags, dates, archived
- **UI Location:** Global search bar in header nav, search results page with filters sidebar/dropdown
- **Accessibility:** Keyboard navigation, screen reader support, high-contrast search term highlighting

## History

### End-of-Day Processing - Completed 2026-04-12
- Built evening ritual for processing captured items and celebrating daily accomplishments. Users process uncategorized transcriptions, completed todos, and new media items one at a time in a calm, focused interface with category-specific actions (assign category, archive, start now, delete, skip). Automatic 8 PM prompt appears on home page when unprocessed items exist. Daily summary displays todos completed, XP earned, current streak, level progress, and items processed. Awards +50 bonus XP for completing ritual (once per day) with XP gain animation and level-up celebration. Optional reflection note for journaling. Session persistence in localStorage tracks completion history. Queue built from: uncategorized transcriptions (no category), todos completed today (for review), new read/watch items created today and still queued. Processing actions preserve items when skipped for later review. Fixed "Start Now" action for media items marks them as in-progress (not broken priority field). Type-safe store with proper TypeScript interfaces (no `any` types), generic `awardXP()` method added to progress store for bonus rewards. Theme-aware calm UI with progress indicators, smooth animations, and keyboard navigation. Files: `src/lib/types/end-of-day.ts`, `src/lib/utils/end-of-day-store.svelte.ts`, `src/routes/end-of-day/+page.svelte`, `src/routes/+page.svelte`, `src/lib/utils/progress-store.svelte.ts`, `docs/domains/end-of-day-processing.md`.

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

### Gamified Todos - Completed 2026-04-12
- Built complete gamification layer for todos to motivate consistent completion. Awards XP when completing todos: 10 base XP with priority multipliers (Low 1x = 10 XP, Medium 1.5x = 15 XP, High 2x = 20 XP), plus +5 XP streak bonus when current streak >= 3 days. Implemented level progression system using formula Level = floor(sqrt(XP/100)) + 1, providing smooth progression curve where Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, etc. Tracks daily completion streaks with compassionate 3-hour grace period after midnight (completions within 3 hours of midnight count as previous day to maintain streaks). Created ProgressDashboard component displaying circular level badge, gradient XP progress bar showing current/total XP to next level, and streak indicator with fire emoji. Built XPGainAnimation component that floats "+XP" text upward from center screen and fades out over 1 second on todo completion. Built LevelUpModal component with celebration modal showing "Level Up!" message, emoji confetti animation (20 particles falling/rotating), auto-closes after 3 seconds. Integrated gamification into todo completion flow (awards XP only when marking complete, not when uncompleting). Stores user progress in localStorage under `drainiac-user-progress` key tracking level, total XP, current/longest streak, and total todos completed. All components theme-aware and respect light/dark mode. Streak compassionately resets to 1 (not 0) after missed day. Files: `src/lib/types/progress.ts`, `src/lib/utils/progress-store.svelte.ts`, `src/lib/components/ProgressDashboard.svelte`, `src/lib/components/XPGainAnimation.svelte`, `src/lib/components/LevelUpModal.svelte`, `src/routes/todos/+page.svelte`.

### Media Metadata Editing - Completed 2026-04-12
- Created MediaEditModal component as generic modal for editing reading/watch item metadata with form fields for title, type, source (author/publication for reading, platform/creator for watching), personal notes (textarea), and tags (comma-separated input). Added "Edit Details" button with pencil icon to both reading and watching pages in item action menus. Implemented modal state management with openEditModal(), closeEditModal(), saveMetadata() functions. Tag input supports comma-separated values with parsing that splits by comma, trims whitespace, and filters empty strings. Display metadata on item cards when present: source with 📝 emoji, notes in gray card with 💭 emoji, tags as colored badge pills with 🏷️ emoji. Modal includes form validation (title required, other fields optional), keyboard shortcuts (ESC to close), click-outside-to-dismiss, theme-aware styling using CSS variables for light/dark mode compatibility, and smooth fade + scale animations. All metadata changes persist to localStorage via existing store.update() method. Files: `src/lib/components/MediaEditModal.svelte`, `src/routes/reading/+page.svelte`, `src/routes/watching/+page.svelte`.
