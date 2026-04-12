# Code Word Detection & Categorization

## Overview

Enhance voice capture with intent detection using code words. When a user starts a transcription with a trigger word like "Todo", "Read", or "Note", the system automatically categorizes the entry. This enables organized thought capture while maintaining the "capture fast, process later" philosophy.

## Requirements

### Code Word Detection

- **Supported code words** (case-insensitive):
  - `"Todo"` → Task to complete
  - `"Read"` → Article, book, or content to read
  - `"Watch"` → Video, film, or content to watch
  - `"Note"` → Free-form note or thought
  - `"Idea"` → Idea to explore later
  - `"Habit"` → Habit-related log or urge

- **Detection logic**:
  - Check first word of transcription (after trimming whitespace)
  - Match case-insensitively (`"todo"`, `"TODO"`, `"Todo"` all work)
  - Remove the code word from the stored text (e.g., "Todo buy milk" → "buy milk" with category "todo")
  - If no code word detected, leave uncategorized (default behavior)

### Data Model Updates

Update the `Transcription` interface:

```typescript
interface Transcription {
  id: string;
  text: string;          // Code word removed if detected
  timestamp: number;
  category?: 'todo' | 'read' | 'watch' | 'note' | 'idea' | 'habit';  // NEW
  rawText?: string;      // NEW: Original text with code word (optional, for reference)
}
```

### UI Enhancements

#### Category Indicators

- **Visual badges** on each transcription item showing category
- **Color coding**:
  - Todo: Blue
  - Read: Green
  - Watch: Purple
  - Note: Gray
  - Idea: Yellow
  - Habit: Orange
- **Icons** (optional but recommended):
  - Todo: Checkbox icon
  - Read: Book icon
  - Watch: Play icon
  - Note: Document icon
  - Idea: Lightbulb icon
  - Habit: Target icon

#### Category Filtering

- **"All" tab** (default) - Shows all transcriptions
- **Category tabs** - One tab per category
- **Show counts** - Display number of items per category in tab labels
- **Hide empty categories** - Don't show tabs for categories with 0 items
- **Uncategorized** - Show items without categories under "All" or separate "Other" tab

### Edge Cases & Validation

- **Multiple code words**: If text starts with "Todo read this article", detect "Todo" only (first word wins)
- **Code word in middle of sentence**: "I should todo this" → NOT detected (must be first word)
- **Just the code word**: "Todo" by itself → Save with category, empty text (or show validation error)
- **Unknown words**: "Shopping buy milk" → No category, store as-is
- **Empty transcription**: Don't save if text is empty after removing code word

### Storage Implementation

- Continue using localStorage with key: `drainiac-transcriptions`
- Backward compatible: Existing transcriptions without `category` field still work
- Sort order: Most recent first (existing behavior)

### User Feedback

- **Live detection preview** (optional enhancement):
  - While recording, if code word detected, show category indicator
  - Example: "Recording as Todo..."
- **Post-save confirmation** (optional):
  - Brief toast/indicator showing category assigned
  - Example: "Added to Todo list"

## Technical Implementation Notes

### Detection Function

```typescript
function detectCategory(text: string): { category?: Category; cleanedText: string } {
  const trimmed = text.trim();
  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
  
  const categoryMap: Record<string, Category> = {
    'todo': 'todo',
    'read': 'read',
    'watch': 'watch',
    'note': 'note',
    'idea': 'idea',
    'habit': 'habit'
  };
  
  const category = categoryMap[firstWord];
  
  if (category) {
    // Remove code word from text
    const cleanedText = trimmed.slice(firstWord.length).trim();
    return { category, cleanedText };
  }
  
  return { cleanedText: trimmed };
}
```

### Storage Migration

No migration needed - new fields are optional, so existing data works as-is.

## Future Enhancements (Out of Scope)

- AI-based intent detection for entries without code words
- Custom code words defined by user
- Bulk re-categorization
- Category-specific processing views (e.g., Todo list with checkboxes)
- Voice confirmation: "Added to your reading list"

## Success Criteria

- ✅ User says "Todo buy milk" → Stored as category "todo", text "buy milk"
- ✅ User says "Just a random thought" → Stored uncategorized
- ✅ User can filter transcriptions by category
- ✅ Existing transcriptions still display correctly
- ✅ Visual indicators clearly show which category each item belongs to
- ✅ Detection happens automatically, no manual categorization needed

## References

- Current implementation: `src/lib/utils/transcription-store.svelte.ts`
- Project vision: `@context/project-overview.md` (Code word system section)
