# Current Feature: Reading & Watch Lists

## Status

In Progress

## Goals

- Create dedicated Reading List and Watch List pages (`/reading`, `/watching`)
- Track status for each item: Queued / In Progress / Completed
- Support editing, deleting, and archiving items
- Implement "What's next?" picker for quick decision-making (randomly shows 3 queued items)
- Add optional metadata: source, notes, tags, rating (post-completion)
- Award XP for completing items (gamification tie-in)
- Migrate existing read/watch transcriptions to new data model
- Dual-write on voice capture ("Read"/"Watch" code words)

## Notes

### Problem
Users capture reading/watching items via voice but they sit in transcription list. No status tracking, no "what's next" picker, no completion satisfaction. Decision fatigue when choosing what to consume.

### Data Models

**ReadingItem:**
```typescript
interface ReadingItem {
  id: string;
  title: string;
  type: 'book' | 'article' | 'other';
  status: 'queued' | 'in-progress' | 'completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  source?: string;        // Author, publication, URL
  notes?: string;
  tags?: string[];
  rating?: 1 | 2 | 3 | 4 | 5;
  archived: boolean;
}
```

**WatchItem:**
```typescript
interface WatchItem {
  id: string;
  title: string;
  type: 'film' | 'series' | 'video' | 'other';
  status: 'queued' | 'in-progress' | 'completed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  source?: string;        // Platform, creator, URL
  notes?: string;
  tags?: string[];
  rating?: 1 | 2 | 3 | 4 | 5;
  archived: boolean;
}
```

### Storage
- `drainiac-reading-list` localStorage key
- `drainiac-watch-list` localStorage key
- Migrate existing transcriptions w/ `category: 'read'` or `category: 'watch'` on first load

### UI Structure

**Pages:** `/reading` and `/watching` (similar layouts)

**Header:**
- Title + count badges (Queued/In Progress/Completed)
- Prominent [What's Next?] button

**Filter Tabs:**
- All / Queued / In Progress / Completed

**List Items Show:**
- Title (large, bold)
- Type badge (Book/Article or Film/Series/Video)
- Status indicator (color-coded)
- Source (if set)
- Tags (if set)
- Action menu: Edit / Start / Complete / Archive / Delete

**Completed Items:**
- Completion date
- Rating stars (if rated)
- Notes (if added)

**"What's Next?" Picker:**
- Modal showing 3 random queued items
- [Start This One] button for each
- [Shuffle] to pick different 3
- On selection: mark in-progress, set `startedAt`, close picker

### XP Rewards (Gamification)
- Complete book: +50 XP
- Complete article: +10 XP
- Complete film: +30 XP
- Complete series/video: +10 XP
- Bonus: +10 XP if from "What's Next?" picker
- Bonus: +5 XP if completed within 24hrs of starting

### Actions
- **Mark In Progress**: Status → in-progress, set `startedAt`
- **Mark Complete**: Status → completed, set `completedAt`, prompt rating, award XP, show celebration
- **Edit**: Inline or modal edit title/type/source/notes/tags
- **Archive**: Hide from main list
- **Delete**: Confirm → remove

### Migration
- On first page load, convert transcriptions with `category: 'read'/'watch'`
- Map: `text` → `title`, `timestamp` → `createdAt`, default `status: 'queued'`
- Set migration flag to prevent re-run

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
