# Gamified Todo List — XP, Streaks, Levels

**Priority:** 🟡 Medium

## Problem

Completing todos feels like a mundane chore with no sense of accomplishment or progress. Users lack motivation to engage with their todo list regularly, leading to incomplete tasks and abandoned lists. A gamification layer can make task completion more satisfying and build positive habits through progress feedback and rewards.

## Current State

- Basic todo CRUD operations exist (Todo List Manager feature)
- Todos can be marked complete but provide no reward or feedback
- No progression system, XP, or visual celebration of accomplishments
- No streak tracking or consistency incentives

## Goals

- Award XP (experience points) when completing todos
- Track daily completion streaks
- Implement a leveling system based on total XP
- Provide satisfying visual feedback on todo completion
- Display user progress: current level, XP progress bar, active streak
- Store gamification data persistently in localStorage
- Make completion feel rewarding without being overwhelming

## Data Model

### User Progress

```typescript
interface UserProgress {
  level: number;              // Current level (starts at 1)
  xp: number;                 // Total lifetime XP earned
  currentStreak: number;      // Days with at least 1 completion
  longestStreak: number;      // Best streak ever
  lastCompletionDate: string; // ISO date string (YYYY-MM-DD)
  todosCompleted: number;     // Total todos completed (all time)
}
```

### XP Calculation

**Base XP per todo:** 10 XP

**Priority multipliers:**
- Low priority: 1x (10 XP)
- Medium priority: 1.5x (15 XP)  
- High priority: 2x (20 XP)

**Streak bonus:** +5 XP per todo if current streak >= 3 days

**Example:** High priority todo + 5-day streak = (10 × 2) + 5 = 25 XP

### Level Calculation

**Formula:** Level = floor(sqrt(XP / 100)) + 1

**Progression:**
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 400 XP
- Level 4: 900 XP
- Level 5: 1600 XP
- Level 10: 8100 XP

This provides a smooth progression curve where early levels are quick to achieve and later levels require sustained effort.

### XP to Next Level

`xpToNextLevel = (level^2 * 100) - currentXP`

## UI Enhancements

### Progress Dashboard

**Header Section (visible on todo list page):**
- User avatar or level badge
- Current level display (e.g., "Level 5")
- XP progress bar with text: "240 / 400 XP"
- Current streak badge: "🔥 5 day streak"

**Optional Stats Panel (expandable):**
- Total todos completed
- Longest streak record
- Current level perks or title (e.g., "Productivity Apprentice")

### Completion Celebration

**On todo complete:**
1. Checkbox animates with satisfying effect (scale up, color burst)
2. XP gained indicator floats up from todo: "+20 XP" (fades out)
3. If level up: Show level-up modal with celebration
   - "Level Up! You're now Level 3"
   - Confetti or particle effect
   - Progress bar fills to 100% then resets
4. If streak extended: Show streak indicator (e.g., "🔥 Streak: 6 days!")
5. Smooth transition of todo to completed list

**Visual Effects:**
- Smooth animations (not jarring)
- Subtle sound effects (optional, off by default)
- Haptic feedback on mobile (if supported)

## Streak Logic

### Daily Streak Rules

- Streak increments if user completes at least 1 todo on a given day
- Streak resets to 0 if a full day passes with no completions
- Streak is based on local timezone dates (not UTC)

### Grace Period

**Compassionate design:** If user completes a todo within 3 hours of midnight, count it as the previous day to maintain their streak.

Example: User completes a todo at 12:30 AM — if last completion was yesterday, streak continues.

### Streak Recovery Message

If streak breaks: "Your streak reset, but that's okay! Every fresh start is a new opportunity. 🌱"

## Interactions

### Complete a Todo

1. User checks off a todo
2. Calculate XP: `baseXP * priorityMultiplier + streakBonus`
3. Award XP: `userProgress.xp += earnedXP`
4. Check for level up: If `level` increases, trigger level-up celebration
5. Update streak: Check if completion extends streak or starts a new one
6. Update `lastCompletionDate` and `todosCompleted` count
7. Show XP gain animation
8. Persist updated `UserProgress` to localStorage

### View Progress

1. Progress dashboard is always visible (collapsed or minimal by default)
2. Click to expand and view detailed stats
3. Show level progression chart or milestones

### Level Up

1. Detect level change on XP update
2. Show modal/overlay: "🎉 Level Up! You're now Level 5!"
3. Brief confetti or particle animation
4. Display new level perks or title (optional)
5. Close modal automatically after 3 seconds (or user dismisses)

## Tests

- **XP calculation**: Verify correct XP for different priorities and streak states
- **Level calculation**: Test level progression formula
- **Streak tracking**: Verify streak increments and resets correctly
- **Daily cutoff**: Test midnight boundary and grace period
- **Level up detection**: Trigger level up and verify celebration displays
- **Persistence**: Refresh page, verify progress persists
- **Multiple completions**: Complete multiple todos in one session, verify XP accumulates
- **Edge case**: Complete todo at 12:01 AM with grace period active

## Notes

- **Ref:** Project vision — Gamified To-Do List (`@context/project-overview.md`)
- **Deps:** Requires Todo List Manager feature to be implemented first
- **Scope:** XP, levels, and streaks only. No leaderboards, achievements, or social features yet.
- **Performance:** Keep animations smooth (60fps) — use CSS transforms and avoid layout thrashing
- **Accessibility:** Ensure animations can be disabled via `prefers-reduced-motion`
- **Future Enhancements:** 
  - Weekly goals and challenges
  - Achievement badges
  - Social streak sharing
  - Customizable rewards
  - Different XP rates for different categories (e.g., Habit completions worth more)
