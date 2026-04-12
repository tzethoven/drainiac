# UI Redesign — Minimal, Smooth, Satisfying

**Priority:** 🟡 Medium

## Problem

The current UI is functional but lacks polish, personality, and visual feedback. Interactions feel abrupt, progress is not clearly communicated, and the design doesn't convey the calm, focused, motivating tone that Drainiac aims for. A cohesive, minimal design with smooth animations and progress indicators will make the app more delightful to use and reinforce positive behaviors.

## Current State

- Functional UI with basic styling
- No cohesive design system or visual identity
- Minimal or no animations
- No progress indicators for actions or loading states
- Inconsistent spacing, typography, and color usage
- No dark mode or theme customization

## Goals

- Establish a cohesive, minimal design system
- Implement smooth, satisfying animations for key interactions
- Add progress indicators for all async actions and loading states
- Create a calming color palette that supports focus and reduces overwhelm
- Improve typography for readability and hierarchy
- Add micro-interactions for feedback (hover states, button presses, transitions)
- Ensure responsive design across mobile, tablet, and desktop
- Support dark mode (optional but recommended)
- Maintain fast performance (60fps animations, no jank)

## Design System

### Color Palette

**Light Mode:**
- **Background:** Clean white or subtle off-white (`#FAFAFA`)
- **Surface:** Light gray cards (`#F5F5F5`)
- **Primary:** Calming blue (`#4A90E2`) for actions, CTAs
- **Success:** Soft green (`#27AE60`) for completions, positive feedback
- **Warning:** Warm orange (`#F39C12`) for due dates, attention items
- **Danger:** Muted red (`#E74C3C`) for delete actions
- **Text:** Dark gray (`#2C3E50`) for primary text
- **Muted Text:** Medium gray (`#7F8C8D`) for secondary text

**Dark Mode:**
- **Background:** Deep dark (`#1A1A1A`)
- **Surface:** Slightly lighter dark (`#2A2A2A`)
- **Primary:** Bright blue (`#5DADE2`)
- **Success:** Bright green (`#2ECC71`)
- **Text:** Off-white (`#ECEFF1`)
- **Muted Text:** Light gray (`#B0BEC5`)

### Typography

**Font Stack:**
- **Primary:** Inter, system-ui, -apple-system, sans-serif
- **Monospace:** 'SF Mono', Monaco, 'Cascadia Code', monospace (for timestamps, data)

**Scale:**
- **Heading 1:** 32px, bold (page titles)
- **Heading 2:** 24px, semi-bold (section titles)
- **Heading 3:** 18px, semi-bold (card headers)
- **Body:** 16px, regular (main content)
- **Small:** 14px, regular (metadata, labels)
- **Tiny:** 12px, regular (timestamps, captions)

**Line Height:**
- Headings: 1.2
- Body: 1.6 (for readability)

### Spacing

Use a consistent spacing scale based on 8px units:
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px

### Border Radius

- **Small:** 4px (buttons, badges)
- **Medium:** 8px (cards, inputs)
- **Large:** 16px (modals, large cards)
- **Circle:** 50% (avatars, round buttons)

### Shadows

Use subtle shadows for depth:
- **Elevation 1:** `box-shadow: 0 1px 3px rgba(0,0,0,0.1)`
- **Elevation 2:** `box-shadow: 0 4px 6px rgba(0,0,0,0.1)`
- **Elevation 3:** `box-shadow: 0 10px 20px rgba(0,0,0,0.15)`

## Animation Principles

### Duration

- **Instant:** 100ms (hover states, small changes)
- **Fast:** 200ms (button presses, toggles)
- **Normal:** 300ms (page transitions, modals)
- **Slow:** 500ms (large movements, celebrations)

### Easing

- **Ease-out:** `cubic-bezier(0, 0, 0.2, 1)` for entrances (items appearing)
- **Ease-in:** `cubic-bezier(0.4, 0, 1, 1)` for exits (items disappearing)
- **Ease-in-out:** `cubic-bezier(0.4, 0, 0.2, 1)` for movements (transitions)

### Respecting User Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Key Interactions & Animations

### Button Press

**Feedback:**
- Scale down slightly on press: `transform: scale(0.98)`
- Subtle shadow change
- Smooth transition (100ms)

**Implementation:**
```css
button {
  transition: transform 100ms ease-out, box-shadow 100ms ease-out;
}

button:active {
  transform: scale(0.98);
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
```

### Todo Completion

**Celebration Sequence:**
1. Checkbox animates: Scale up slightly, rotate, color transition (200ms)
2. Todo text: Slide through with strikethrough (300ms)
3. XP indicator: Float up from todo, fade out (500ms)
4. If level up: Trigger confetti or particle burst

**Implementation:**
- Use CSS animations for checkbox and strikethrough
- Use JavaScript for XP float-up (position absolute, transform translate)
- Use lightweight confetti library (e.g., canvas-confetti) for celebrations

### Page Transitions

**Smooth Navigation:**
- Fade out current page (200ms)
- Fade in next page (200ms, delayed 100ms)
- Optional: Slide animation for mobile (swipe gestures)

**Implementation:**
- Use SvelteKit's built-in transitions or custom transition directives
- Leverage `transition:fade` or custom `transition:slide`

### Loading States

**Skeleton Screens:**
- Show content placeholders while loading (better than spinners)
- Pulse animation on skeleton elements

**Spinners:**
- Use for short waits (<2 seconds) in buttons or inline content
- Smooth rotation animation

**Progress Bars:**
- For longer tasks (e.g., processing queue, end-of-day ritual)
- Animated fill with smooth easing

### Modal Animations

**Entrance:**
- Modal overlay fades in (200ms)
- Modal content scales up from 0.95 to 1 (300ms, ease-out)

**Exit:**
- Modal content scales down to 0.95 (200ms, ease-in)
- Modal overlay fades out (200ms)

## Progress Indicators

### Todo List Progress

**Visual Elements:**
- Progress bar showing % of todos complete
- Count display: "5 / 12 completed"
- Animate progress bar fill on completion

**Location:** Top of todo list page or dashboard

### XP Progress Bar

**Visual Elements:**
- Horizontal bar showing XP progress to next level
- Text: "240 / 400 XP to Level 6"
- Fill animates smoothly on XP gain
- Color gradient for visual interest

**Location:** Header or user profile section

### Streak Indicator

**Visual Elements:**
- Fire emoji or icon: 🔥
- Streak count: "5 days"
- Animate on streak extension (scale up, glow effect)

**Location:** Dashboard or header

### End-of-Day Processing

**Visual Elements:**
- Progress bar at top: "Item 3 of 8"
- Percentage: "37% complete"
- Smooth fill animation as items are processed

**Location:** Top of end-of-day processing view

## Responsive Design

### Breakpoints

- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

### Mobile Optimizations

- Larger tap targets (minimum 44px × 44px)
- Simplified navigation (bottom tab bar or hamburger menu)
- Swipe gestures for common actions (e.g., swipe to archive)
- Fullscreen modals instead of overlays
- Sticky header with minimal chrome

### Tablet & Desktop

- Multi-column layouts where appropriate
- Larger cards with more visual breathing room
- Sidebar navigation
- Hover states (not available on mobile)

## Component Library

Create reusable, styled components:

- **Button:** Primary, secondary, danger variants
- **Card:** Surface for grouping content
- **Badge:** Category, status, priority indicators
- **Input:** Text input with label, error states
- **Modal:** Overlay with content card
- **Toast/Snackbar:** Brief notifications
- **Progress Bar:** Linear progress indicator
- **Checkbox:** Styled checkbox with animations
- **Avatar/Level Badge:** User identity display

## Accessibility

- **Contrast Ratios:** Minimum WCAG AA (4.5:1 for normal text, 3:1 for large text)
- **Focus States:** Visible focus indicators for keyboard navigation
- **Screen Reader Support:** Proper ARIA labels, semantic HTML
- **Keyboard Navigation:** All interactions accessible via keyboard
- **Reduced Motion:** Respect `prefers-reduced-motion` preference

## Tests

- **Visual Regression:** Compare before/after screenshots (use Playwright or Chromatic)
- **Animation Performance:** Verify 60fps on target devices
- **Responsive Design:** Test on multiple screen sizes and devices
- **Dark Mode:** Verify all components render correctly in dark mode
- **Accessibility Audit:** Run Lighthouse or axe DevTools, fix all issues
- **Cross-Browser:** Test on Chrome, Firefox, Safari, Edge
- **User Feedback:** Conduct informal usability testing with target users

## Implementation Phases

### Phase 1: Design System Setup

1. Define color palette, typography, spacing in CSS variables
2. Create base component library (Button, Card, Badge)
3. Apply consistent styling to existing pages

### Phase 2: Animations

1. Add button press animations
2. Implement todo completion animations
3. Add page transition animations
4. Add modal entrance/exit animations

### Phase 3: Progress Indicators

1. Add todo list progress bar
2. Add XP progress bar
3. Add streak indicator
4. Add end-of-day processing progress

### Phase 4: Polish

1. Implement dark mode
2. Add micro-interactions (hover states, tooltips)
3. Optimize for mobile (swipe gestures, touch feedback)
4. Conduct accessibility audit and fix issues

## Notes

- **Ref:** Project design principles: "Minimise time spent in app", "Compassion over discipline"
- **Deps:** This is a cross-cutting concern — touches all features
- **Scope:** Visual redesign only. No new features or functionality.
- **Performance:** Prioritize speed and smoothness. Avoid jank, optimize animations.
- **Inspiration:** Look at apps like Things 3, Todoist, Notion for minimal, calm design
- **Tools:** 
  - Figma for design mockups (optional but recommended)
  - CSS variables for theming
  - Svelte transitions for animations
  - Tailwind CSS (if using utility-first approach) or custom CSS
- **Future Enhancements:**
  - Custom themes (user-defined color schemes)
  - Sound effects for completions (optional, off by default)
  - Haptic feedback on mobile
  - More celebration animations (e.g., different effects for level milestones)
