# Current Feature: Todo List Manager

## Status

In Progress

## Goals

- Create a dedicated Todo List view/page showing all todos
- Support marking todos as complete
- Support editing todo text
- Support deleting todos
- Support archiving completed todos (move to archive, hide from main list)
- Add todo-specific metadata: status (pending/complete), priority (optional), due date (optional)
- Maintain localStorage persistence

## Notes

### Problem
Users capture todos via voice with "Todo" code word, but no way act on them. Todos sit in transcription list with no complete/edit/archive/delete. Breaks "capture fast, process later" workflow.

### Data Model
```typescript
interface Todo {
  id: string;
  text: string;
  status: 'pending' | 'complete';
  createdAt: number;
  completedAt?: number;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: number;
  archived: boolean;
}
```

### Storage Strategy
- Store todos separately: `drainiac-todos` localStorage key
- No migration from existing transcriptions
- Transcriptions with `category: 'todo'` remain in transcription list

### UI Structure (`/todos` page)
**Main View:**
- Header: "My Todos" + count badge
- Filter tabs: All / Active / Complete
- Sort options: Created date / Due date / Priority
- Todo items show: checkbox, text (strike-through when complete), priority badge, due date, action menu

**Empty State:**
- "No todos yet. Say 'Todo' followed by your task to add one!"

**Actions:**
- Complete/Uncomplete: Click checkbox
- Edit: Click text → inline edit
- Delete: Trash icon → confirm → remove
- Archive: Hide from main list
- Set Priority: Low/Med/High
- Set Due Date: Date picker

### Tests
- CRUD operations in localStorage
- Status toggle + timestamp
- Filter by status (all/active/complete)
- Sort by date, priority, due date
- Archive + hide from main list
- Empty state display
- Persistence after refresh

### Scope
- Basic CRUD + management only
- Gamification (XP, streaks, levels) = separate feature
- Future: Subtasks, tags, notes, recurring todos (out of scope)

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
