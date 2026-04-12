# Current Feature: UI Redesign — Minimal, Smooth, Satisfying

## Status

In Progress

## Goals

- Establish a cohesive, minimal design system (colors, typography, spacing, shadows)
- Implement smooth, satisfying animations for key interactions (button press, todo completion, page transitions, modals)
- Add progress indicators for async actions and loading states
- Create a calming color palette that supports focus and reduces overwhelm
- Improve typography for readability and hierarchy
- Add micro-interactions for feedback (hover states, button presses, transitions)
- Ensure responsive design across mobile, tablet, and desktop
- Support dark mode with toggle
- Maintain fast performance (60fps animations, no jank)
- Respect user's `prefers-reduced-motion` preference

## Notes

### Problem
Current UI functional but lacks polish, personality, visual feedback. Interactions feel abrupt, no progress indicators, inconsistent spacing/colors/typography, no dark mode.

### Design System

**Color Palette:**
- Light mode: white bg, light gray cards, calming blue primary, soft green success, warm orange warning, muted red danger
- Dark mode: deep dark bg, slightly lighter dark cards, bright blue primary, bright green success

**Typography:**
- Font: Inter, system-ui, sans-serif
- Scale: H1 (32px), H2 (24px), H3 (18px), Body (16px), Small (14px), Tiny (12px)
- Line height: 1.2 (headings), 1.6 (body)

**Spacing Scale (8px units):**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

**Border Radius:**
- Small: 4px, Medium: 8px, Large: 16px, Circle: 50%

**Shadows:**
- Elevation 1: `0 1px 3px rgba(0,0,0,0.1)`
- Elevation 2: `0 4px 6px rgba(0,0,0,0.1)`
- Elevation 3: `0 10px 20px rgba(0,0,0,0.15)`

### Animation Principles

**Duration:**
- Instant: 100ms (hover states)
- Fast: 200ms (button presses, toggles)
- Normal: 300ms (page transitions, modals)
- Slow: 500ms (celebrations)

**Easing:**
- Ease-out: `cubic-bezier(0, 0, 0.2, 1)` for entrances
- Ease-in: `cubic-bezier(0.4, 0, 1, 1)` for exits
- Ease-in-out: `cubic-bezier(0.4, 0, 0.2, 1)` for movements

**Respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Key Interactions

**Button Press:**
- Scale down to 0.98 on press
- Subtle shadow change
- 100ms transition

**Todo Completion:**
1. Checkbox: scale up, rotate, color transition (200ms)
2. Text: slide-through with strikethrough (300ms)
3. XP indicator: float up from todo, fade out (500ms)
4. If level up: confetti/particle burst

**Page Transitions:**
- Fade out current (200ms)
- Fade in next (200ms, delayed 100ms)
- Optional slide for mobile

**Modal Animations:**
- Entrance: overlay fade in + content scale up 0.95→1
- Exit: content scale down + overlay fade out

### Progress Indicators

**Todo List Progress:**
- Bar showing % complete
- Count: "5 / 12 completed"
- Animate fill on completion

**XP Progress Bar:**
- Horizontal bar showing XP to next level
- "240 / 400 XP to Level 6"
- Smooth fill animation on XP gain
- Color gradient

**Streak Indicator:**
- Fire emoji: 🔥 + "5 days"
- Animate on streak extension

### Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Optimizations:**
- Larger tap targets (44px min)
- Simplified navigation (bottom tab or hamburger)
- Swipe gestures for actions
- Fullscreen modals
- Sticky header

### Component Library

Create reusable styled components:
- Button (primary, secondary, danger variants)
- Card (surface for grouping)
- Badge (category, status, priority)
- Input (label + error states)
- Modal (overlay + content)
- Toast/Snackbar (notifications)
- Progress Bar
- Checkbox (animated)
- Avatar/Level Badge

### Implementation Phases

**Phase 1: Design System Setup**
- Define color palette, typography, spacing in CSS variables
- Create base component library
- Apply consistent styling to existing pages

**Phase 2: Animations**
- Button press animations
- Todo completion animations
- Page transition animations
- Modal entrance/exit animations

**Phase 3: Progress Indicators**
- Todo list progress bar
- XP progress bar
- Streak indicator
- End-of-day processing progress

**Phase 4: Polish**
- Dark mode implementation
- Micro-interactions (hover, tooltips)
- Mobile optimizations (swipe gestures)
- Accessibility audit + fixes

### Accessibility
- WCAG AA contrast ratios (4.5:1 normal, 3:1 large text)
- Visible focus indicators
- Proper ARIA labels + semantic HTML
- Full keyboard navigation
- Respect `prefers-reduced-motion`

### Tools
- CSS variables for theming
- Svelte transitions for animations
- Tailwind CSS v4 (already using)
- canvas-confetti for celebrations (lightweight)

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

### Todo List Manager - Completed 2026-04-12
- Built dedicated `/todos` page with full CRUD operations for managing captured todos. Users can now mark todos complete/incomplete, edit text inline with explicit Save/Cancel buttons, delete with confirmation, and archive to hide from main view. Added todo-specific metadata including status (pending/complete), optional priority levels (low/medium/high), and optional due dates with overdue warnings. Implemented filter tabs (All/Active/Complete) with live counts and a manual todo entry form for direct input. Voice-captured todos using "to do" code word automatically sync to the todo list via dual-write pattern with error handling. Extracted shared localStorage utility (`local-storage.ts`) to eliminate duplication between transcription and todo stores. This completes the "capture fast, process later" workflow for todos by enabling users to act on captured tasks.

### Reading & Watch Lists - Completed 2026-04-12
- Built dedicated `/reading` and `/watching` pages with status workflow (Queued → In Progress → Completed). Implemented "What's Next?" picker that shows 3 random queued items with shuffle option, reducing decision fatigue when choosing what to consume. Users can add items manually or via voice capture ("Read"/"Watch" code words auto-sync via dual-write). Full CRUD operations: inline edit (with Save/Cancel buttons), delete with confirmation, archive to hide from main list. Added type selectors (Book/Article for reading, Film/Series/Video for watching), optional post-completion 5-star rating, and XP calculation (+10 to +50 based on type, +5 bonus if completed within 24hrs). Filter tabs (All/Queued/In Progress/Completed) with live counts. Extracted generic `createMediaStore` to eliminate 95% code duplication between reading/watch stores (~180 lines each reduced to ~30 lines). Auto-migrates existing read/watch transcriptions on first load. XP values centralized in constants. Documented deferred features (metadata editing UI, XP celebration animation) in `docs/future-enhancements.md`.
