# Reading & Watch Lists — Status Tracking & Picker

**Priority:** 🟡 Medium

## Problem

Users can capture reading and watching items via voice ("Read..." / "Watch..."), but these items sit in the transcription list with no dedicated interface for tracking status, prioritizing, or deciding what to consume next. Without a structured media queue, users face decision fatigue and captured items lose their value.

## Current State

- Items can be captured with "Read" and "Watch" code words
- Items are stored as `Transcription` objects with `category: 'read'` or `category: 'watch'`
- No dedicated view for read/watch lists
- No status tracking (queued, in-progress, completed)
- No "What's next?" picker to reduce decision fatigue
- No source tracking or notes

## Goals

- Create dedicated Reading List and Watch List pages
- Track status for each item: Queued / In Progress / Completed
- Support editing, deleting, and archiving items
- Implement "What's next?" picker for quick decision-making
- Add optional metadata: source, notes, tags, rating (post-completion)
- Award XP for completing items (gamification tie-in)
- Migrate existing read/watch transcriptions to new data model

## Data Model

### Reading Item

```typescript
interface ReadingItem {
  id: string;                          // UUID
  title: string;                       // Book/article title
  type: 'book' | 'article' | 'other';  // Content type
  status: 'queued' | 'in-progress' | 'completed';
  createdAt: number;                   // Unix timestamp
  startedAt?: number;                  // When marked in-progress
  completedAt?: number;                // When marked complete
  source?: string;                     // Author, publication, URL
  notes?: string;                      // Personal notes
  tags?: string[];                     // Custom tags
  rating?: 1 | 2 | 3 | 4 | 5;         // Post-completion rating
  archived: boolean;                   // Hidden from main list
}
```

### Watch Item

```typescript
interface WatchItem {
  id: string;                          // UUID
  title: string;                       // Film/video/series title
  type: 'film' | 'series' | 'video' | 'other';
  status: 'queued' | 'in-progress' | 'completed';
  createdAt: number;                   // Unix timestamp
  startedAt?: number;                  // When marked in-progress
  completedAt?: number;                // When marked complete
  source?: string;                     // Platform, creator, URL
  notes?: string;                      // Personal notes
  tags?: string[];                     // Custom tags
  rating?: 1 | 2 | 3 | 4 | 5;         // Post-completion rating
  archived: boolean;                   // Hidden from main list
}
```

Store separately in localStorage:
- `drainiac-reading-list`
- `drainiac-watch-list`

### Migration Strategy

- Convert existing transcriptions with `category: 'read'` or `category: 'watch'`
- Map `text` → `title`, `timestamp` → `createdAt`, default `status: 'queued'`
- Run migration on first load of reading/watch list pages

## UI Structure

### Reading List Page (`/reading`)

**Header:**
- Title: "Reading List"
- Count badges: Queued (5) / In Progress (2) / Completed (12)
- [What's Next?] button (prominent)

**Filter Tabs:**
- All / Queued / In Progress / Completed

**List View:**
- Each item shows:
  - Title (large, bold)
  - Type badge (Book / Article)
  - Status indicator (color-coded)
  - Source (if set)
  - Tags (if set)
  - Action menu: Edit / Mark In Progress / Mark Complete / Archive / Delete

**Completed Items:**
- Show with completion date
- Optional rating stars
- Notes (if added)

**Empty State:**
- "No items in your reading list. Say 'Read' followed by a title to add one!"

### Watch List Page (`/watching`)

Same structure as Reading List, but for watch items.

### "What's Next?" Picker

**Modal or Overlay:**
- Title: "What should you read/watch next?"
- Randomly picks 3 items from "Queued" status
- Shows each with:
  - Title
  - Type
  - Source (if available)
  - [Start This One] button
- If fewer than 3 queued items, show all
- [Shuffle] button to pick 3 different items
- [Cancel] to close without choosing

**On Selection:**
1. Mark chosen item as "In Progress"
2. Set `startedAt` timestamp
3. Close picker
4. Show confirmation: "Enjoy! Mark it complete when you're done."
5. Navigate to detail view (optional)

## Item Actions

### Mark In Progress

1. User clicks "Start" or selects item from picker
2. Status changes to `in-progress`
3. `startedAt` timestamp set
4. Visual feedback: Status badge updates

### Mark Complete

1. User clicks "Complete" action
2. Status changes to `completed`
3. `completedAt` timestamp set
4. Optional: Prompt for rating (1-5 stars)
5. Award XP: +30 XP (book/film) or +10 XP (article/video)
6. Show celebration: "+30 XP"
7. Item moves to Completed tab

### Edit Item

1. User clicks Edit action
2. Modal or inline form opens
3. Editable fields: title, type, source, notes, tags
4. Save or cancel
5. Persist changes to localStorage

### Archive

1. User clicks Archive
2. `archived` flag set to `true`
3. Item hidden from main list (still accessible via "Archived" view)
4. Fade-out animation

### Delete

1. User clicks Delete
2. Confirmation: "Delete this item? This can't be undone."
3. If confirmed: Remove from localStorage
4. Fade-out animation

## XP Rewards (Gamification Integration)

**XP Values:**
- Complete a book: +50 XP
- Complete an article: +10 XP
- Complete a film: +30 XP
- Complete a series episode: +10 XP per episode (or +30 for whole series)
- Complete a video: +10 XP

**Bonus XP:**
- Completing an item from "What's Next?" picker: +10 bonus XP
- Completing within 24 hours of marking in-progress: +5 bonus XP

## Interactions

### Using "What's Next?" Picker

1. User clicks "What's Next?" button
2. App filters items with `status: 'queued'`
3. Randomly select 3 items (or fewer if less than 3 available)
4. Display picker modal with 3 options
5. User clicks "Start This One" on chosen item
6. Mark item as in-progress, close picker

### Completing an Item

1. User clicks "Complete" on an in-progress item
2. Status changes to `completed`, `completedAt` set
3. Prompt for rating: "How was it? Rate 1-5 stars"
4. User rates (optional, can skip)
5. Calculate XP: base XP + any bonuses
6. Award XP, show "+50 XP" animation
7. Update user progress (if gamification enabled)
8. Item moves to Completed tab

### Filtering by Status

1. User clicks filter tab (All / Queued / In Progress / Completed)
2. List updates to show only items matching filter
3. Count badges update

## Tests

- **CRUD operations**: Create, read, update, delete items
- **Status transitions**: Queued → In Progress → Completed
- **Picker logic**: Verify 3 random items selected from queued items
- **XP calculation**: Verify correct XP awarded for different item types
- **Filtering**: Filter by status, verify correct items shown
- **Migration**: Convert transcriptions to structured items
- **Persistence**: Refresh page, verify items persist
- **Empty states**: Trigger with no items, verify empty state displays
- **Completion celebration**: Mark item complete, verify XP animation

## Notes

- **Ref:** Project vision — Reading & Watch List (`@context/project-overview.md`)
- **Deps:** 
  - Code Word Categorization (for capturing read/watch items)
  - Gamified Todo List (optional, for XP rewards)
- **Scope:** Reading and watching lists only. Notes, Ideas, Habits are separate features.
- **Future Enhancements:**
  - Integration with external services (Goodreads, IMDb, etc.)
  - Track reading/watching time or progress (% complete)
  - Recommendations based on completed items
  - Social sharing: "I just finished reading X!"
  - Import from bookmarking services or RSS feeds
  - Advanced picker logic (prioritize by age, tags, or user preferences)
