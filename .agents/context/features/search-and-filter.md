# Search & Filter — Find Anything Fast

**Priority:** 🔵 Low

## Problem

As users capture more thoughts, todos, and items over time, the app becomes cluttered and hard to navigate. Without search and advanced filtering, users can't quickly find specific items, leading to frustration and lost thoughts. A robust search and filter system is essential for long-term usability and making captured items truly actionable.

## Current State

- All items (transcriptions, todos, read/watch items) are accessible via their respective pages
- No global search across all content
- Limited filtering options (status, category tabs)
- No full-text search or keyword matching
- No way to filter processed vs unprocessed items globally
- No search history or saved filters

## Goals

- Implement global search across all content types (todos, transcriptions, reading, watching, notes, ideas)
- Support full-text search with keyword matching
- Filter by category, status, date range, tags
- Quick filter: Processed vs Unprocessed items
- Display search results in unified view with context
- Fast, client-side search (no backend required for Phase 1)
- Search history (optional)
- Keyboard shortcut for quick search access (e.g., Cmd/Ctrl + K)

## Search Scope

### Searchable Content

**Todos:**
- Todo text
- Priority, status, due date
- Created/completed dates

**Transcriptions:**
- Transcription text
- Category
- Timestamp

**Reading & Watch Items:**
- Title, source, notes, tags
- Type, status
- Dates

**Notes & Ideas (future):**
- Title, content, tags
- Creation date

### Search Index

For fast client-side search, build an in-memory search index on app load:

```typescript
interface SearchableItem {
  id: string;
  type: 'todo' | 'transcription' | 'reading' | 'watching' | 'note' | 'idea';
  title: string;              // Main text or title
  content?: string;           // Additional searchable text (notes, descriptions)
  category?: string;          // todo, read, watch, note, etc.
  status?: string;            // pending, complete, queued, in-progress, etc.
  tags?: string[];            // Tags for filtering
  createdAt: number;          // Unix timestamp
  completedAt?: number;       // If applicable
  archived: boolean;          // Include archived items in search?
}
```

## UI Structure

### Global Search Bar

**Location:**
- Header nav, always visible
- Search icon + input field
- Click or keyboard shortcut (Cmd/Ctrl + K) to focus

**Search Input:**
- Placeholder: "Search anything..."
- Autocomplete suggestions (optional)
- Clear button (X) when text entered
- Search executes on keypress (live results) or Enter

### Search Results Page

**Header:**
- Search query display: "Showing results for 'buy milk'"
- Result count: "Found 5 items"
- Clear search button

**Filters (Sidebar or Dropdown):**
- **Category:** All / Todo / Read / Watch / Note / Idea / Transcription
- **Status:** All / Processed / Unprocessed / Complete / Pending / In Progress
- **Date Range:** Custom date picker
- **Tags:** Multi-select tag filter
- **Archived:** Include archived items toggle

**Results List:**
- Grouped by type (optional) or chronological
- Each result shows:
  - Type badge (Todo, Read, etc.)
  - Title/text with search term highlighted
  - Status indicator
  - Timestamp
  - Snippet of content (if applicable)
  - Click to open item detail view

**Empty State:**
- "No results found for 'xyz'"
- Suggestions: Check spelling, try different keywords, clear filters

## Search Logic

### Keyword Matching

**Simple fuzzy search:**
- Case-insensitive
- Matches partial words (e.g., "milk" matches "buy milk" or "milkshake")
- Supports multiple keywords (AND logic): "buy milk" matches items containing both "buy" AND "milk"

**Libraries (optional):**
- Use Fuse.js or Lunr.js for more advanced fuzzy search
- For Phase 1, simple string matching is sufficient

### Processed vs Unprocessed Filter

**Definition:**
- **Processed:** 
  - Todos: Marked complete or archived
  - Read/Watch: Status is in-progress or completed
  - Transcriptions: Deleted or converted to a specific category
- **Unprocessed:**
  - Todos: Status is pending
  - Read/Watch: Status is queued
  - Transcriptions: Still in main transcription list, not categorized

**Quick Filter Buttons:**
- [All Items] [Processed] [Unprocessed]
- Apply filter instantly without navigating away from search results

## Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open search bar (focus input)
- `Esc`: Close search results or clear search
- `Arrow keys`: Navigate search results
- `Enter`: Open selected result

## Interactions

### Perform Search

1. User types query in search bar
2. Search executes on each keypress (debounced 300ms) or on Enter
3. Build search index from all data sources (todos, transcriptions, etc.)
4. Filter index by query using keyword matching
5. Apply active filters (category, status, date range)
6. Display results on search results page
7. Highlight search terms in results

### Apply Filters

1. User selects filter option (e.g., Category: Todo)
2. Search results update to show only matching items
3. Filter selection persists while user browses results
4. Clear filters button resets all filters

### Open Search Result

1. User clicks on a search result
2. Navigate to item detail view or open item in context (e.g., todo list page with item highlighted)
3. Optional: Keep search query active for quick return to results

### Quick Filter: Processed vs Unprocessed

1. User clicks "Unprocessed" quick filter button
2. Search results filter to show only unprocessed items across all categories
3. Button highlights to indicate active filter
4. Click again to toggle off

## Tests

- **Keyword matching**: Search for "milk", verify items containing "milk" appear
- **Multi-keyword search**: Search for "buy milk", verify only items with both words appear
- **Category filter**: Filter by "Todo", verify only todos shown
- **Status filter**: Filter by "Unprocessed", verify only pending/queued items shown
- **Date range filter**: Filter by last 7 days, verify results match
- **Empty state**: Search for non-existent term, verify empty state displays
- **Keyboard shortcut**: Press Cmd+K, verify search bar focuses
- **Result navigation**: Use arrow keys to navigate results
- **Highlight search terms**: Search for "milk", verify "milk" is highlighted in results
- **Performance**: Search with 1000+ items, verify results render quickly (<500ms)

## Notes

- **Ref:** None directly in project vision, but essential for scalability
- **Deps:** All content types (Todos, Transcriptions, Reading/Watch Lists)
- **Scope:** Client-side search only. No backend or external search service.
- **Performance:** For Phase 1, client-side search is sufficient. For large datasets (10k+ items), consider indexing or pagination.
- **Accessibility:** Ensure keyboard navigation, screen reader support, and high-contrast search term highlighting
- **Future Enhancements:**
  - Saved searches or filters
  - Search history with quick access to recent searches
  - Advanced query syntax (e.g., `status:pending category:todo`)
  - Search suggestions based on common queries
  - Export search results to CSV or JSON
  - Backend-powered search with Elasticsearch or similar (if/when backend is added)
