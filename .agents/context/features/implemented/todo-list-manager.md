# Todo List Manager — CRUD Operations

**Priority:** 🔴 Critical

## Problem

Users can capture todos via voice with the "Todo" code word, but they have no way to act on them. Captured todos sit in the transcription list with no ability to mark them complete, edit details, archive, or delete. This breaks the "capture fast, process later" workflow because there's no processing step for todos.

## Current State

- Voice capture works with code word detection
- Todos are stored as `Transcription` objects with `category: 'todo'`
- Todos appear in the transcription list with a category badge
- No dedicated todo view or management interface exists
- No todo-specific metadata (status, due date, priority, etc.)

## Goals

- Create a dedicated Todo List view/page showing all todos
- Support marking todos as complete
- Support editing todo text
- Support deleting todos
- Support archiving completed todos (move to archive, hide from main list)
- Add todo-specific metadata: status (pending/complete), priority (optional), due date (optional)
- Maintain localStorage persistence
- Ensure smooth migration path from current `Transcription` schema

## Data Model

### Todo Interface

```typescript
interface Todo {
  id: string;                    // UUID
  text: string;                  // Main todo content
  status: 'pending' | 'complete'; // Completion status
  createdAt: number;             // Unix timestamp
  completedAt?: number;          // Unix timestamp when marked complete
  priority?: 'low' | 'medium' | 'high';  // Optional priority
  dueDate?: number;              // Optional Unix timestamp
  archived: boolean;             // Whether hidden from main list
}
```

### Migration Strategy

- Migrate existing `Transcription` items with `category: 'todo'` to new `Todo` objects
- Store todos separately in localStorage: `drainiac-todos`
- Keep transcriptions for historical reference, or remove todo transcriptions after migration
- Run migration on first load of todo manager

## UI Structure

### Todo List Page (`/todos`)

**Main View:**
- Header with title "My Todos" and count badge
- Filter tabs: All / Active / Complete
- Sort options: Created date / Due date / Priority
- List of todo items, each showing:
  - Checkbox (unchecked for pending, checked for complete)
  - Todo text (strike-through when complete)
  - Priority indicator (color-coded badge)
  - Due date (if set, with overdue warning)
  - Action menu (edit / archive / delete)

**Empty State:**
- Show friendly message: "No todos yet. Say 'Todo' followed by your task to add one!"
- Optional: Link to voice capture

**Completed Todos:**
- Show in separate "Complete" tab
- Display with strikethrough and completion timestamp
- Bulk archive action: "Archive all completed"

### Todo Item Actions

1. **Complete/Uncomplete**: Click checkbox to toggle status
2. **Edit**: Click todo text to enter edit mode (inline or modal)
3. **Delete**: Trash icon → confirm → remove permanently
4. **Archive**: Archive icon → move to archived list (hidden by default)
5. **Set Priority**: Dropdown or buttons (Low/Med/High)
6. **Set Due Date**: Date picker

## Interactions

### Completing a Todo
1. User clicks checkbox
2. Todo status changes to 'complete'
3. `completedAt` timestamp set
4. Visual feedback: Strike-through animation
5. Todo moves to "Complete" tab after 1-2 seconds (optional smooth transition)

### Editing a Todo
1. User clicks on todo text
2. Text becomes editable (inline or modal)
3. Save on blur or Enter key
4. Cancel on Escape key
5. Show save indicator

### Archiving
1. User clicks archive icon or selects "Archive" from menu
2. `archived` flag set to `true`
3. Todo removed from main list with fade-out animation
4. Optional: Show undo toast for 3 seconds

### Deleting
1. User clicks delete icon
2. Confirmation dialog: "Delete this todo? This can't be undone."
3. If confirmed: Remove from storage
4. Fade-out animation

## Tests

- **CRUD operations**: Create, read, update, delete todos in localStorage
- **Status toggle**: Mark todo complete, verify status and timestamp
- **Filtering**: Filter by status (all/active/complete)
- **Sorting**: Sort by date, priority, due date
- **Archive**: Archive todo, verify it's hidden from main list
- **Migration**: Convert existing todo transcriptions to Todo objects
- **Empty state**: Display empty state when no todos exist
- **Persistence**: Refresh page, verify todos persist

## Notes

- **Ref:** Project vision — Gamified To-Do List (see `@context/project-overview.md`)
- **Scope:** This feature focuses on basic CRUD and management. Gamification (XP, streaks, levels) is a separate feature.
- **Deps:** None — uses existing localStorage patterns
- **Future:** Subtasks, tags, notes, recurring todos (out of scope for this feature)
