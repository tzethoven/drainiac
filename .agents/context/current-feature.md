# Current Feature: Gamified Todo List — XP, Streaks, Levels

## Status

In Progress

## Goals

- Award XP (experience points) when completing todos
- Track daily completion streaks
- Implement a leveling system based on total XP
- Provide satisfying visual feedback on todo completion
- Display user progress: current level, XP progress bar, active streak
- Store gamification data persistently in localStorage
- Make completion feel rewarding without being overwhelming

## Notes

### Problem
Completing todos feels mundane with no sense of accomplishment or progress. Users lack motivation to engage regularly, leading to incomplete tasks and abandoned lists. Gamification can make completion more satisfying and build positive habits.

### Data Model

**UserProgress:**
```typescript
interface UserProgress {
  level: number;              // Current level (starts at 1)
  xp: number;                 // Total lifetime XP earned
  currentStreak: number;      // Days with at least 1 completion
  longestStreak: number;      // Best streak ever
  lastCompletionDate: string; // ISO date string (YYYY-MM-DD)
  todosCompleted: number;     // Total todos completed (all time)
}
```

**XP Calculation:**
- Base XP per todo: 10 XP
- Priority multipliers: Low 1x (10 XP), Medium 1.5x (15 XP), High 2x (20 XP)
- Streak bonus: +5 XP per todo if current streak >= 3 days
- Example: High priority todo + 5-day streak = (10 × 2) + 5 = 25 XP

**Level Calculation:**
- Formula: `Level = floor(sqrt(XP / 100)) + 1`
- Level 1: 0 XP, Level 2: 100 XP, Level 3: 400 XP, Level 4: 900 XP, Level 5: 1600 XP
- Smooth progression curve (early levels quick, later levels require sustained effort)
- XP to next level: `(level^2 * 100) - currentXP`

### UI Enhancements

**Progress Dashboard (header on todo list page):**
- User avatar or level badge
- Current level display ("Level 5")
- XP progress bar with text: "240 / 400 XP"
- Current streak badge: "🔥 5 day streak"

**Optional Stats Panel (expandable):**
- Total todos completed
- Longest streak record
- Current level title (e.g., "Productivity Apprentice")

**Completion Celebration:**
1. Checkbox animates (scale up, color burst)
2. XP gained floats up from todo: "+20 XP" (fades out)
3. If level up: Show modal with confetti/particles ("🎉 Level Up! You're now Level 3")
4. If streak extended: Show streak indicator ("🔥 Streak: 6 days!")
5. Smooth transition to completed list

**Visual Effects:**
- Smooth animations (not jarring)
- Subtle sound effects (optional, off by default)
- Haptic feedback on mobile (if supported)

### Streak Logic

**Daily Streak Rules:**
- Streak increments if user completes at least 1 todo on a given day
- Streak resets to 0 if full day passes with no completions
- Based on local timezone dates (not UTC)

**Grace Period (compassionate design):**
- If user completes todo within 3 hours of midnight, count as previous day to maintain streak
- Example: Completion at 12:30 AM counts as yesterday if last completion was yesterday

**Streak Recovery Message:**
- If streak breaks: "Your streak reset, but that's okay! Every fresh start is a new opportunity. 🌱"

### Completion Flow

1. User checks off a todo
2. Calculate XP: `baseXP * priorityMultiplier + streakBonus`
3. Award XP: `userProgress.xp += earnedXP`
4. Check for level up: If level increases, trigger level-up celebration
5. Update streak: Check if completion extends streak or starts new one
6. Update `lastCompletionDate` and `todosCompleted` count
7. Show XP gain animation (+20 XP floats up)
8. Persist updated UserProgress to localStorage

### Tests
- XP calculation for different priorities + streak states
- Level calculation formula accuracy
- Streak increments and resets correctly
- Daily cutoff at midnight + grace period
- Level up detection + celebration display
- Persistence after refresh
- Multiple completions in one session accumulate XP
- Edge case: completion at 12:01 AM with grace period

### Scope
- XP, levels, and streaks only
- No leaderboards, achievements, or social features yet
- Animations must be smooth (60fps)
- Respect `prefers-reduced-motion`

### Storage
- `drainiac-user-progress` localStorage key
- Initialize with default values on first load

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
