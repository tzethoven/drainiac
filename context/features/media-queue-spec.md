# Reading & Watch List — Feature Specification

## Overview

A curated media queue for books, films, articles, podcasts, and other recommendations. The feature reduces decision fatigue by surfacing one recommendation at a time through a "What's next?" picker, while tracking source and progress.

## Requirements

### Functional Requirements

1. **Media Entry Management**
   - Add items via voice capture or manual input
   - Edit item details
   - Remove items from queue
   - Archive completed items
   - Restore accidentally removed items

2. **Media Properties**
   - Title (required)
   - Type (book, film, article, podcast, video, other)
   - Source/recommender (optional)
   - Date added (auto)
   - URL/link (optional)
   - Notes (optional)
   - Estimated time/length (optional)
   - Cover image/thumbnail (optional)

3. **Status Tracking**
   - Queued (default)
   - In Progress
   - Done
   - Abandoned/Not Interested

4. **"What's Next?" Picker**
   - Surface one recommendation at a time
   - Filter by media type (e.g., "What book should I read?")
   - Randomization with smart weighting:
     - Recent additions weighted slightly higher
     - Items from trusted sources weighted higher
     - Balance types to avoid showing same type repeatedly
   - Option to skip and see another suggestion
   - Mark as "started" directly from picker

5. **Queue Management**
   - View full list grouped by type
   - Search queue
   - Sort by date added, source, type
   - Filter by status
   - Bulk operations (future consideration)

6. **Clearing Mechanism** (to be refined)
   - Swipe to remove
   - "Not interested" with reason (optional)
   - Archive with rating/review (optional)
   - Prevent accidental removals

### Non-Functional Requirements

1. **Performance**
   - Fast list rendering
   - Smooth picker animations
   - Efficient image loading

2. **User Experience**
   - Eliminate decision paralysis
   - Single-tap actions where possible
   - Clear visual distinction between states
   - Motivating to see progress

3. **Design**
   - Visual media type icons
   - Clean, uncluttered interface
   - Satisfying completion interactions

## References

- Related specs: `voice-capture-spec.md`, `data-storage-spec.md`, `work-private-separation-spec.md`
- Design inspiration: Pocket, Goodreads, Letterboxd
