# Future Enhancements

## Content Consumption — Session Mode (Medium Priority)

**Status:** Not implemented  
**Impact:** Medium — directly supports a core use case

When consuming a piece of content (book chapter, podcast, film, article), the user naturally generates ideas, todos, and notes. Currently these are captured as standalone voice notes with no link to the source material.

**User scenario:**
> User is watching a documentary and captures 3 ideas and 1 todo via voice. Later, during end-of-day processing, there is no way to know all four items came from the same source or what that source was.

**Proposed feature — Content Session Mode:**
- User nominates what they are consuming before they start (links to a reading/watch item, or a freeform title)
- All voice captures during that session are automatically tagged with the source (e.g. `source: "Atomic Habits – Ch. 3"`)
- Session ends when user explicitly closes it or navigates away
- Tags/source visible in end-of-day processing and search results

**Minimal alternative (lower effort):**
- Add a new code word (e.g. `"From"`) that allows the user to prefix a capture with a source inline: *"From Atomic Habits — Idea: habit stacking for morning routine"*
- Parser extracts source name and stores it alongside the capture

**Implementation notes:**
- Session state would be ephemeral (in-memory, not persisted across app restarts)
- Source field already exists on `ReadingItem` / `WatchItem` — tag could reference the item ID
- Estimated effort (session mode): 4–6 hours; (code word approach): 1–2 hours

---

## Reading & Watch Lists

### Metadata Editing (Medium Priority)

**Status:** Deferred from initial implementation  
**Impact:** Medium

Currently, reading and watch items support `source`, `notes`, and `tags` fields in the data model, but no UI exists to edit these fields.

**Missing functionality:**
- Can't add author/publication/URL to reading items
- Can't add platform/creator to watch items  
- Can't add personal notes after completing items
- Can't add tags for organization

**Implementation:**
- Add edit modal with fields for: title, type, source, notes, tags
- Or expand inline edit to include all fields
- Estimated effort: 2-4 hours

---

### XP Celebration Animation (Low Priority)

**Status:** Deferred from initial implementation  
**Impact:** Low (nice-to-have)

XP is calculated and logged to console when completing items, but no visual celebration animation is shown.

**Missing functionality:**
- No visual feedback on item completion
- "+50 XP!" message only appears in console
- Reduces gamification satisfaction

**Implementation:**
- Add toast/modal with animated "+X XP!" message
- Celebrate with confetti or other animation
- Show XP progress bar if gamification system expanded
- Estimated effort: 2-3 hours

---

### "What's Next?" Picker Bonus (Low Priority)

**Status:** Not implemented  
**Impact:** Low

Spec mentioned +10 XP bonus if item started from "What's Next?" picker, but not implemented.

**Missing functionality:**
- No tracking of whether item started from picker
- No bonus XP awarded

**Implementation:**
- Add `startedFromPicker?: boolean` field to data model
- Track in `startFromPicker()` function
- Add bonus in XP calculation
- Estimated effort: 1 hour

---

## General

### localStorage Validation

**Status:** Not implemented  
**Impact:** Security/Robustness

Data loaded from localStorage is not validated with Zod or similar schema validation.

**Risk:**
- User can tamper with data via DevTools
- Malformed data could cause runtime crashes
- Potential XSS if data rendered unsafely

**Implementation:**
- Add Zod schemas for all localStorage data models
- Validate on load, return empty array if invalid
- Estimated effort: 2-3 hours
