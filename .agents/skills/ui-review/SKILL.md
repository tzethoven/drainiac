---
name: ui-review
description: Reviews UI components and pages for visual issues, responsiveness, and accessibility. Use when implementing or modifying UI components, pages, or layouts.
---

# UI Review

Review the specified UI code for issues. If a path or component is provided via arguments, focus on that. Otherwise review recently changed UI files.

## What to Check

### Visual

- Layout issues (overlapping, misaligned elements)
- Spacing consistency
- Color contrast (WCAG AA minimum)
- Typography hierarchy

### Accessibility

- Alt text on images
- Clickable element sizes (minimum 44x44px)
- Focus states visible
- Color not sole indicator
- Semantic HTML elements
- ARIA labels where needed

### Marketing Specific

- Clear value proposition above fold
- CTA buttons prominent
- Social proof visible
- Fast visual hierarchy

## Output

Provide a concise summary with numbered issues, grouped by severity:

1. **Critical** — Broken layout, inaccessible elements
2. **Warning** — Inconsistencies, minor layout issues
3. **Suggestion** — Polish and nice-to-haves
