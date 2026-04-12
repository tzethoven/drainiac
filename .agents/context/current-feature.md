# Current Feature: Code Word Detection & Categorization

## Status

In Progress

## Goals

- Detect code words (Todo, Read, Watch, Note, Idea, Habit) at the start of transcriptions
- Automatically categorize transcriptions based on detected code word
- Remove code word from stored text (e.g., "Todo buy milk" → category: "todo", text: "buy milk")
- Add visual category badges with color coding and icons to transcription items
- Implement category filtering with tabs (All, Todo, Read, Watch, Note, Idea, Habit)
- Show item counts in category tabs
- Maintain backward compatibility with existing uncategorized transcriptions
- Handle edge cases: empty text after code word removal, unknown words, code word only

## Notes

### Supported Categories
- **Todo** (blue, checkbox icon) - Tasks to complete
- **Read** (green, book icon) - Articles, books, content to read
- **Watch** (purple, play icon) - Videos, films, content to watch
- **Note** (gray, document icon) - Free-form notes and thoughts
- **Idea** (yellow, lightbulb icon) - Ideas to explore later
- **Habit** (orange, target icon) - Habit-related logs or urges

### Detection Rules
- Case-insensitive matching
- Must be first word (after trimming whitespace)
- First word wins if multiple code words present
- No detection if code word appears mid-sentence

### Data Model Changes
```typescript
interface Transcription {
  id: string;
  text: string;          // Code word removed if detected
  timestamp: number;
  category?: 'todo' | 'read' | 'watch' | 'note' | 'idea' | 'habit';  // NEW
  rawText?: string;      // NEW: Original text with code word (optional)
}
```

### Files to Modify
- `src/lib/utils/transcription-store.svelte.ts` - Add detection logic and category field
- `src/routes/+page.svelte` - Add category badges, filtering UI, and icons
- `src/lib/types/transcription.ts` (create) - Type definitions for Category

### Storage Strategy
- Continue using localStorage (key: `drainiac-transcriptions`)
- No migration needed - new fields are optional
- Backward compatible with existing data

### Optional Enhancements (Consider for Later)
- Live detection preview while recording
- Post-save confirmation toast
- Voice confirmation feedback

## History

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
