# End-of-Day Processing

**Domain:** User Workflows  
**Status:** ✅ Implemented  
**Version:** 1.0 (2026-04-12)

## Overview

The End-of-Day Processing feature completes Drainiac's core "capture fast, process later" philosophy by providing a dedicated evening ritual for reviewing captured items, organizing thoughts, and celebrating daily accomplishments.

## Purpose

Throughout the day, users capture thoughts via voice without categorizing or acting on them. By evening, this creates a queue of unprocessed items. The end-of-day ritual provides:

- **Calm, focused environment** for processing captured items one at a time
- **Closure & satisfaction** from seeing daily accomplishments
- **Motivation** through bonus XP rewards
- **Reflection** via optional journaling

## User Journey

### 1. Automatic Prompt (8 PM+)

When user opens the app after 8 PM with unprocessed items:

```
🌙 Ready to wrap up your day?
You have 5 items to process.

[Start Processing]  [Later]
```

### 2. Processing Queue

Items are presented one at a time in a focused card view:

- **Progress indicator**: "Item 3 of 8" with progress bar
- **Item details**: Type badge, text/title
- **Context-specific actions** based on item type
- **Skip button**: Leave item for later

**Queue includes:**
- Uncategorized transcriptions (no category assigned)
- Todos completed today (for review/archive)
- New reading items (created today, still queued)
- New watch items (created today, still queued)

### 3. Category-Specific Actions

**Uncategorized Transcriptions:**
- 🏷️ Assign Category → Opens modal to choose todo/read/watch/note/idea/habit
- 🗑️ Delete → Remove item
- ⏭️ Skip → Leave for later

**Completed Todos:**
- 📦 Archive → Move to archive (hide from main list)
- ↩️ Keep Active → Unmark as complete
- ⏭️ Skip

**Reading/Watch Items:**
- ▶️ Start Now → Mark as in-progress (moves to active queue)
- 🗑️ Delete → Remove item
- ⏭️ Skip → Keep queued

### 4. Daily Summary

After processing all items (or skipping to summary):

```
✨ Day Complete!

Great work today! Here's what you achieved:

📝 8 Items Processed
☑️ 5 Todos Completed
⚡ 120 XP Total XP
🔥 6 Day Streak

🎁 Completing your end-of-day ritual: +50 XP!

How are you feeling about today? (optional)
[Reflection textarea]

[Finish]
```

**Empty Queue:**
If no items to process, shows encouraging message:
```
🎉 Nothing to Process!
You're all caught up. Great job staying on top of things!
```

## Technical Architecture

### Data Models

**EndOfDaySession** (`src/lib/types/end-of-day.ts`):
```typescript
interface EndOfDaySession {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  itemsProcessed: number;
  todosCompleted: number;
  reflectionNote?: string;
  completedAt: number; // Unix timestamp
}
```

**ProcessableItem**:
```typescript
type ProcessableItemType =
  | 'uncategorized-transcription'
  | 'completed-todo'
  | 'reading-item'
  | 'watch-item';

interface ProcessableItem {
  id: string;
  type: ProcessableItemType;
  category?: Category;
  data: Transcription | Todo | ReadingItem | WatchItem;
  timestamp: number; // For sorting
}
```

### Store Logic

**End-of-Day Store** (`src/lib/utils/end-of-day-store.svelte.ts`):

**Queue Building:**
```typescript
buildQueue(
  transcriptions: Transcription[],
  todos: Todo[],
  readingItems: ReadingItem[],
  watchItems: WatchItem[]
): ProcessableItem[]
```

Gathers:
1. Transcriptions without category
2. Todos completed today (for review)
3. Reading items created today + still queued
4. Watch items created today + still queued

Sorted by timestamp (oldest first).

**Processing Flow:**
- `startProcessing(queue)` - Initialize session
- `getCurrentItem()` - Get current item in queue
- `processNextItem()` - Advance to next item
- `skipCurrentItem()` - Skip without processing
- `getProgress()` - Calculate current/total/percentage

**Completion:**
```typescript
completeRitual(
  itemsProcessed: number,
  todosCompleted: number,
  reflectionNote: string | undefined,
  progressStore: ProgressStore
): { bonusXP: number; levelUp: boolean; newLevel: number }
```

- Creates session record in localStorage
- Awards +50 bonus XP via `progressStore.awardXP(50)`
- Only awards once per day (checks existing sessions by date)
- Returns level-up status for celebration

**Prompt Logic:**
```typescript
shouldShowPrompt(queueLength: number): boolean
```
- Returns true if after 8 PM + unprocessed items + not completed today
- Used by home page to show automatic prompt

### UI Components

**Processing Page** (`src/routes/end-of-day/+page.svelte`):

- **Header**: Title with theme toggle
- **Processing View**: One-at-a-time card with progress bar
- **Summary View**: Stats grid + reflection + finish button
- **Category Picker Modal**: 6-button grid for assigning categories
- **XP Gain Animation**: Float-up "+50 XP" on completion
- **Level-Up Modal**: Celebration if bonus XP triggers level-up

**Home Page Integration** (`src/routes/+page.svelte`):

Adds automatic prompt banner:
```svelte
{#if showEodPrompt}
  <div class="eod-prompt">
    🌙 Ready to wrap up your day?
    You have {queueLength} items to process.
    [Start Processing] [Later]
  </div>
{/if}
```

Uses `$effect` to check `shouldShowPrompt()` reactively.

### Progress Store Enhancement

Added generic XP award method to `progress-store.svelte.ts`:

```typescript
awardXP(xpAmount: number): {
  xp: number;
  levelUp: boolean;
  newLevel: number;
}
```

Allows awarding XP from any source (not just todo completion). Updates total XP, recalculates level, saves to localStorage.

## Storage

**Sessions**: `localStorage` key `drainiac-eod-sessions`
- Array of `EndOfDaySession` objects
- Persists ritual completion history
- Used to prevent double-awarding bonus XP

## Design Principles

**Calm, Not Overwhelming:**
- Muted background colors
- One item at a time (no scrolling list)
- Progress bar, not countdown timer
- Gentle animations (fade/slide)

**Compassionate Tone:**
- Celebratory summary, not guilt-inducing
- "Great work today!" not "You only processed X items"
- Optional reflection (no pressure)
- "Nothing to process" is positive message

**Efficient Processing:**
- Clear action buttons with emojis
- Skip button always available
- Auto-advance after action
- Keyboard shortcuts (ESC to close modals)

## Integration Points

**Depends On:**
- Transcription Store (uncategorized items)
- Todo Store (completed todos, archive action)
- Reading/Watch Stores (queued items, markInProgress action)
- Progress Store (XP awards, level tracking)

**Provides To:**
- Home page (automatic prompt logic)
- Progress system (daily ritual bonus XP)

## Gamification

**Bonus XP:** +50 XP for completing ritual (once per day)

**Celebration Flow:**
1. User clicks "Finish" on summary page
2. `completeRitual()` awards bonus XP
3. XP gain animation floats "+50 XP" upward
4. If level-up triggered, level-up modal shows with confetti
5. Auto-navigate to home after 1.5s (or 3.5s if level-up)

**XP Integration:**
- Uses existing `XPGainAnimation` component
- Uses existing `LevelUpModal` component
- Persists to same `drainiac-user-progress` key
- Shows updated level/streak in summary stats

## Future Enhancements

**Documented in `docs/future-enhancements.md`:**

1. **Weekly review mode** - Similar flow for weekly retrospective
2. **Custom prompt time** - User-configurable trigger time (not hardcoded 8 PM)
3. **Streak recovery** - Offer grace period if ritual missed one day
4. **Export reflections** - Download all reflection notes as journal
5. **Daily XP tracking** - Accurately show XP earned today (not just total)
6. **Processing analytics** - Track completion rate, average processing time

## Accessibility

- Theme-aware (light/dark mode)
- Keyboard navigation (Tab, Enter, ESC)
- High contrast mode compatible
- Respects `prefers-reduced-motion`
- Screen reader friendly (semantic HTML, ARIA labels on modals)

## Known Limitations

**Phase 1:**
- Client-side only (no server validation)
- localStorage only (no sync across devices)
- No input validation with Zod (documented security consideration)
- Daily XP not accurately tracked (summary shows total XP, not earned today)

**Acceptable for MVP** - All limitations documented and will be addressed in Phase 2 (post-auth).

## Related Documentation

- Feature Spec: `.agents/context/features/end-of-day-processing.md`
- Project Overview: `.agents/context/project-overview.md` (Future Considerations)
- Security Review: Pre-commit review (2 warnings, acceptable for Phase 1)
- Refactoring Opportunities: Date utilities duplication (deferred)
- Code Quality: All TypeScript/logic issues resolved

## Testing

**Manual Test Scenarios:**

1. **Empty queue**: Navigate to `/end-of-day` with no unprocessed items → See "Nothing to process" message
2. **Process uncategorized**: Capture voice note without code word, process in EOD, assign category → Item moved to appropriate store
3. **Review completed todo**: Complete a todo, process in EOD → Archive or keep active
4. **Start media item**: Add reading/watch item, process in EOD → Mark as in-progress
5. **Bonus XP**: Complete ritual → See +50 XP animation + level-up if applicable
6. **Double-claim prevention**: Complete ritual, try again same day → Bonus not re-awarded
7. **8 PM prompt**: Change system time to 8 PM+ with unprocessed items → See prompt on home page
8. **Skip items**: Skip multiple items → Items remain unprocessed, still in queue on next visit
9. **Reflection note**: Enter reflection, finish ritual → Note persisted in session
10. **Progress tracking**: Process 3 of 5 items → See "Item 3 of 5" with 60% progress bar

## Version History

**v1.0 (2026-04-12)** - Initial implementation
- Queue building from all sources
- One-at-a-time processing flow
- Category-specific actions
- Daily summary with stats
- Bonus XP rewards
- Automatic 8 PM prompt
- Session persistence
