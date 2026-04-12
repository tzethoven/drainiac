# Current Feature: Reading & Watch Metadata Editing

## Status

In Progress

## Goals

- Add edit modal for reading/watch items with all metadata fields
- Support editing source (author/publication/URL for reading, platform/creator for watching)
- Support adding/editing personal notes after completion
- Support adding/editing tags for organization
- Maintain existing inline title/type editing
- Persist all metadata changes to localStorage
- Ensure modal is theme-aware and responsive

## Notes

### Problem
Reading and watch items support `source`, `notes`, and `tags` fields in the data model, but no UI exists to edit these fields. Users can only edit title and type inline, limiting the usefulness of the media lists for organization and reference.

### Missing Functionality
- Can't add author/publication/URL to reading items
- Can't add platform/creator/URL to watch items
- Can't add personal notes after completing items (thoughts, takeaways, etc.)
- Can't add tags for organization and filtering
- Data model supports these fields but they're unused

### Data Model (Already Exists)

**ReadingItem / WatchItem:**
```typescript
interface MediaItem {
  id: string;
  title: string;
  type: string;
  status: MediaStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  source?: string;       // ← NOT EDITABLE IN UI
  notes?: string;        // ← NOT EDITABLE IN UI
  tags?: string[];       // ← NOT EDITABLE IN UI
  rating?: 1 | 2 | 3 | 4 | 5;
  archived: boolean;
}
```

### UI Approach

**Option 1: Edit Modal (Recommended)**
- Add "Edit Details" button/icon to each item
- Opens modal with form containing all fields:
  - Title (text input)
  - Type (dropdown)
  - Source (text input with placeholder)
  - Notes (textarea)
  - Tags (tag input component or comma-separated text)
- Save/Cancel buttons
- Modal uses existing modal animation patterns (scale + fade)

**Option 2: Expand Inline Edit**
- When clicking edit, expand item to show all fields inline
- More complex UI, harder to fit on mobile
- Less recommended

### Implementation Plan

1. **Create MediaEditModal component** (`src/lib/components/MediaEditModal.svelte`)
   - Generic component that works for both reading and watch items
   - Props: item, itemType ('reading' | 'watching'), onSave, onCancel
   - Form with all fields
   - Tag input (simple comma-separated for now)
   - Theme-aware styling

2. **Update reading-store and watch-store**
   - Already have `update()` method
   - No changes needed to store logic

3. **Update /reading and /watching pages**
   - Add "Edit Details" button to each item's action menu
   - Import MediaEditModal
   - Handle modal open/close state
   - Pass item data to modal
   - Handle save callback to update store

4. **Display metadata when present**
   - Show source, notes, tags on item cards when they exist
   - Truncate/collapse long notes
   - Visual tag badges

### Placeholders for Source Field

**Reading:**
- "Author, publication, or URL"
- Examples: "Tolkien", "The New York Times", "https://..."

**Watching:**
- "Platform, creator, or URL"
- Examples: "Netflix", "Kurzgesagt", "https://youtube.com/..."

### Tag Input

**Simple approach (Phase 1):**
- Single text input with comma-separated values
- "productivity, work, urgent" → `['productivity', 'work', 'urgent']`
- Trim whitespace, filter empty strings
- Display as badge pills

**Future enhancement:**
- Autocomplete from existing tags
- Add/remove individual tag buttons
- Tag color coding

### Visual Design

**Item Card Changes:**
```
[Title]
[Type Badge] [Status Badge]
📝 Source: Author/Creator (if present)
💭 Notes: "Great insights about..." (if present, truncated)
🏷️ [tag1] [tag2] [tag3] (if present)
[Actions: Edit Details | Archive | Delete]
```

**Edit Modal:**
```
┌─────────────────────────────────┐
│ Edit Details                    │
├─────────────────────────────────┤
│ Title: [____________]           │
│ Type:  [Dropdown ▼]            │
│ Source: [____________]          │
│         (Author, publication...) │
│ Notes: [____________]           │
│        [____________]           │
│        [____________]           │
│ Tags: [____________]            │
│       (comma-separated)         │
│                                 │
│       [Cancel]  [Save]         │
└─────────────────────────────────┘
```

### Scope

**In scope:**
- Edit source, notes, tags for reading/watch items
- Display metadata on item cards
- Modal UI with form validation
- Theme-aware styling

**Out of scope:**
- Tag autocomplete (future)
- Advanced tag management (future)
- Filtering by tags (future - part of search/filter feature)
- Rich text editing for notes (future)
- Source validation or parsing (future)

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

### Gamified Todos - Completed 2026-04-12
- Built complete gamification layer for todos to motivate consistent completion. Awards XP when completing todos: 10 base XP with priority multipliers (Low 1x = 10 XP, Medium 1.5x = 15 XP, High 2x = 20 XP), plus +5 XP streak bonus when current streak >= 3 days. Implemented level progression system using formula Level = floor(sqrt(XP/100)) + 1, providing smooth progression curve where Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 400 XP, etc. Tracks daily completion streaks with compassionate 3-hour grace period after midnight (completions within 3 hours of midnight count as previous day to maintain streaks). Created ProgressDashboard component displaying circular level badge, gradient XP progress bar showing current/total XP to next level, and streak indicator with fire emoji. Built XPGainAnimation component that floats "+XP" text upward from center screen and fades out over 1 second on todo completion. Built LevelUpModal component with celebration modal showing "Level Up!" message, emoji confetti animation (20 particles falling/rotating), auto-closes after 3 seconds. Integrated gamification into todo completion flow (awards XP only when marking complete, not when uncompleting). Stores user progress in localStorage under `drainiac-user-progress` key tracking level, total XP, current/longest streak, and total todos completed. All components theme-aware and respect light/dark mode. Streak compassionately resets to 1 (not 0) after missed day. Files: `src/lib/types/progress.ts`, `src/lib/utils/progress-store.svelte.ts`, `src/lib/components/ProgressDashboard.svelte`, `src/lib/components/XPGainAnimation.svelte`, `src/lib/components/LevelUpModal.svelte`, `src/routes/todos/+page.svelte`.
