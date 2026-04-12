# End-of-Day Processing Mode — Evening Ritual

**Priority:** 🟡 Medium

## Problem

Users capture thoughts throughout the day but lack a dedicated time and interface to review, organize, and process them. Without a structured end-of-day ritual, captured items pile up and lose their value. An evening processing mode provides a calm, focused environment to close the day, review accomplishments, and prepare for tomorrow.

## Current State

- Captured items are accessible via main transcription list or category-specific pages
- No dedicated "processing mode" or workflow for reviewing items
- No end-of-day summary or reflection prompt
- Users must manually navigate between categories to process items
- No sense of closure or completion at the end of the day

## Goals

- Create a dedicated End-of-Day Processing interface (accessible via button or automatic prompt)
- Guide user through processing queued items from all categories
- Show daily accomplishment summary (todos completed, XP earned, streak status)
- Optional: End-of-day reflection prompt
- Provide sense of closure and satisfaction
- Award bonus XP for completing the end-of-day ritual
- Make the experience calm, focused, and not overwhelming

## User Flow

### 1. Trigger End-of-Day Mode

**Automatic Prompt:**
- If user opens app after 8 PM and has unprocessed items, show prompt:
  - "Ready to wrap up your day? You have 5 items to process."
  - [Start Processing] [Later]

**Manual Entry:**
- Button in main nav: "End of Day" or "Process Queue"
- Always accessible, regardless of time

### 2. Processing Queue Workflow

**Queue Construction:**
- Gather all unprocessed items across categories:
  - Uncategorized transcriptions (no category)
  - Todos marked as complete today (for review/archive)
  - New read/watch items (to set status or priority)
  - Notes/ideas (to tag, expand, or promote)

**One-at-a-Time Display:**
- Show one item at a time in focused card view
- Minimal distractions, calm background
- Item type badge (e.g., "Note" or "Todo")
- Item text prominently displayed
- Action buttons relevant to item type

**Actions by Category:**

**Uncategorized Transcriptions:**
- [Assign Category] → Choose: Todo / Read / Watch / Note / Idea / Habit
- [Delete] → Remove
- [Keep as Note] → Convert to categorized note
- [Skip] → Leave unprocessed for later

**Completed Todos:**
- Already complete, just reviewing
- [Archive] → Move to archive
- [Keep Active] → Unmark as complete (if user changed mind)

**Read/Watch Items:**
- [Set Priority] → Low / Medium / High
- [Mark as Next] → Add to "What's next?" queue
- [Delete] → Remove

**Notes/Ideas:**
- [Add Tags] → Input tags
- [Promote to Todo] → Convert to actionable todo
- [Keep] → Save as-is
- [Delete] → Remove

**Progress Indicator:**
- Show progress: "Item 3 of 8"
- Progress bar at top
- Optional: Skip queue and jump to summary

### 3. Daily Summary

**After processing all items (or user skips to summary):**

**Accomplishments Section:**
- "Great work today! Here's what you achieved:"
- Todos completed: "5 tasks completed"
- XP earned today: "+120 XP"
- Current streak: "🔥 6 day streak"
- Level progress: "Level 5 → 45% to Level 6"

**Items Processed:**
- "You processed 8 captured thoughts"
- Breakdown: 3 todos, 2 notes, 2 read items, 1 watch item

**Reflection Prompt (Optional):**
- "How are you feeling about today?"
- Freeform text input or mood picker (1-5 stars)
- Saved as end-of-day journal entry

**Bonus XP Award:**
- "Completing your end-of-day ritual: +50 XP"
- Special badge or animation

**Call to Action:**
- [Finish] → Return to home
- [View Tomorrow's Priorities] → Quick preview of upcoming todos

## Data Model

### End-of-Day Session

```typescript
interface EndOfDaySession {
  id: string;               // UUID
  date: string;             // ISO date (YYYY-MM-DD)
  itemsProcessed: number;   // Count of items reviewed
  todosCompleted: number;   // Todos completed today
  xpEarned: number;         // Total XP earned today
  reflectionNote?: string;  // Optional reflection
  completedAt: number;      // Unix timestamp when ritual completed
}
```

Store sessions in localStorage: `drainiac-eod-sessions`

### Bonus XP

- Award 50 XP for completing end-of-day ritual
- Only award once per day
- Track last completed date to prevent double-claiming

## UI Design

### Processing Mode Layout

**Focused Card View:**
- Dark or muted background (calm mood)
- Single centered card with current item
- Large, readable text
- Clear action buttons (not overwhelming)
- Subtle progress indicator at top

**Navigation:**
- Back button: Return to main app (exit processing mode)
- Skip button: Skip current item, move to next
- Progress bar: Visual indicator of completion

### Summary Page

**Celebratory but Calm:**
- Friendly congratulatory message
- Visual summary cards with stats
- Optional: Subtle celebration animation (gentle, not jarring)
- Warm color palette

## Interactions

### Start End-of-Day Processing

1. User clicks "End of Day" button or accepts automatic prompt
2. App gathers all unprocessed items and builds queue
3. If queue is empty: Show summary immediately with message: "Nothing to process today. Great job staying on top of things!"
4. If queue has items: Show first item with action buttons

### Process an Item

1. User selects an action (e.g., Assign Category, Archive, Add Tags)
2. Perform action (update item data, move to new category, etc.)
3. Animate item exit (fade out, slide away)
4. Load next item (fade in)
5. Update progress bar

### Skip an Item

1. User clicks Skip
2. Item remains unprocessed
3. Move to next item
4. Skipped items still available in main app

### Complete Ritual

1. User reaches end of queue or clicks "Skip to Summary"
2. Calculate stats: todos completed, XP earned, items processed
3. Award bonus XP (+50)
4. Show summary page with celebration
5. Store end-of-day session in localStorage

## Tests

- **Queue construction**: Verify correct items included in processing queue
- **Item processing**: Process item, verify it's updated and removed from queue
- **Skip functionality**: Skip item, verify it remains unprocessed
- **Progress tracking**: Verify progress bar and counter update correctly
- **Summary stats**: Verify correct calculation of todos completed, XP earned
- **Bonus XP**: Verify bonus awarded once per day
- **Empty queue**: Trigger with no items, verify empty state message
- **Reflection save**: Enter reflection, verify it's stored
- **Persistence**: Exit mid-ritual, return later, verify queue state preserved (optional)

## Notes

- **Ref:** Project vision — End-of-day or weekly review mode (`@context/project-overview.md`)
- **Deps:** 
  - Todo List Manager (for completed todos)
  - Gamified Todo List (for XP and streak calculations)
  - Code Word Categorization (for processing uncategorized items)
- **Scope:** End-of-day only. Weekly review is out of scope for this feature.
- **Design Philosophy:** Calm, not overwhelming. Focus on closure and satisfaction, not guilt or pressure.
- **Accessibility:** Ensure readable text, good contrast, and logical keyboard navigation
- **Future Enhancements:**
  - Weekly review mode
  - Mood tracking over time
  - Customizable reflection prompts
  - Integration with calendar/planner for next-day prep
  - Notification reminder for end-of-day ritual
