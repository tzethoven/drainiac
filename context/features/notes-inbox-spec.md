# Notes, Ideas & Free Thoughts — Feature Specification

## Overview

A lightweight inbox for thoughts that don't fit into structured categories like tasks or media. This module supports capturing ideas, feelings, journal-like reflections, and miscellaneous thoughts, with tools to explore, process, and eventually find closure or promote to other categories.

## Requirements

### Functional Requirements

1. **Note Management**
   - Create notes via voice capture or manual input
   - Edit note content
   - Delete or archive notes
   - Restore recently deleted notes
   - Rich text formatting (optional)
   - Attach images or links (future consideration)

2. **Note Properties**
   - Content (required)
   - Type/category: idea, note, feeling, journal entry
   - Tags (multiple, optional)
   - Date/time created (auto)
   - Date/time modified (auto)
   - Status: new, processing, resolved, archived

3. **Organization & Discovery**
   - Search by content or tags
   - Filter by type and status
   - Sort by date created/modified
   - Tag-based navigation
   - "Random note" picker for rediscovery

4. **Processing & Exploration**
   - Mark notes as "processing" to indicate active thought
   - Add follow-up thoughts to existing notes
   - Link related notes (future consideration)
   - AI-assisted exploration prompts:
     - "Tell me more about this"
     - "Why does this matter?"
     - "What action could this become?"

5. **Closure & Resolution**
   - Mark note as "resolved"
   - Add closing thoughts or conclusions
   - Summary view of resolved notes
   - Export or save resolution (future consideration)

6. **Promotion to Other Categories**
   - Convert note to task (with optional prefill)
   - Convert note to media item
   - Convert note to habit definition
   - Keep link back to original note

7. **AI-Assisted Features** (future consideration)
   - Automatic summarization of long notes
   - Clustering related notes
   - Pattern detection across notes
   - Mood/sentiment tracking

### Non-Functional Requirements

1. **Performance**
   - Fast search (< 200ms)
   - Instant note opening
   - Efficient rendering of long notes

2. **User Experience**
   - Minimal friction to capture thoughts
   - Non-judgmental, supportive tone
   - One thing at a time when reviewing
   - Easy to promote or resolve

3. **Privacy**
   - Sensitive thoughts protected
   - Clear work/private separation
   - Optional encryption (future consideration)

## References

- Related specs: `voice-capture-spec.md`, `data-storage-spec.md`, `work-private-separation-spec.md`, `todo-list-spec.md`, `media-queue-spec.md`
- Design inspiration: Notion, Obsidian, Day One journal
