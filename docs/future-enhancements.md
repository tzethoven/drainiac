# Future Enhancements

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
