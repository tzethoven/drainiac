# Habit & Impulse Control Tracker — Feature Specification

## Overview

A compassionate, non-punishing module focused on breaking addictive or unwanted behaviors. When users feel an impulse, they log the urge and are immediately offered pre-configured alternative activities. The design emphasizes support, not shame.

## Requirements

### Functional Requirements

1. **Habit Definition**
   - Create habits to avoid/break
   - Define habit name (e.g., "Social media scrolling", "Smoking", "Junk food")
   - Add description/motivation (optional)
   - Configure alternative suggestions (required):
     - Multiple alternatives per habit
     - Examples: "Go for a 5-minute walk", "Drink water", "Open reading list", "Take 5 deep breaths"
   - Set habit severity/importance (optional)
   - Archive resolved habits

2. **Urge Logging**
   - Quick access button: "I'm feeling the urge"
   - Select which habit/urge
   - Log timestamp automatically
   - Optional: log intensity (1-10 scale)
   - Optional: log context (location, mood, trigger)
   - Optional: voice note about the urge

3. **Alternative Suggestion System**
   - Immediately present pre-configured alternatives
   - Randomize or rotate suggestions
   - Allow user to mark "did this alternative" or "still struggling"
   - Track which alternatives are most effective
   - Easy path to log another urge if still struggling

4. **Streak Tracking**
   - Track days without acting on the habit
   - Recovery-aware messaging: no shame for breaking streaks
   - Visual progress indicator
   - Milestone celebrations (7 days, 30 days, etc.)
   - "Last urge" and "Last action" timestamps

5. **Pattern Detection** (optional, future consideration)
   - Time of day analysis
   - Day of week patterns
   - Mood correlations
   - Trigger identification
   - Present insights compassionately

6. **Reflection Prompts**
   - Optional end-of-day check-in
   - Optional post-relapse reflection (non-judgmental)
   - Guided questions:
     - "What led to this moment?"
     - "What could help next time?"
     - "What are you proud of today?"
   - Save reflections for future reference

7. **Progress Visualization**
   - Calendar view with urge-free days highlighted
   - Urge frequency over time graph
   - Success rate with alternatives
   - Overall trend (improving/stable/struggling)

### Non-Functional Requirements

1. **Performance**
   - Instant access to urge logging (< 1 second)
   - Fast alternative presentation
   - Smooth animations for encouragement

2. **User Experience**
   - Compassionate, supportive tone throughout
   - No punishing language or red "failure" indicators
   - Emphasize progress, not perfection
   - Private and shame-free environment
   - Minimal clicks to log urge and see alternatives

3. **Design**
   - Calming color palette
   - Encouraging micro-copy
   - Clear but gentle notifications
   - Celebrate wins without trivializing struggle

4. **Privacy**
   - Highly sensitive data
   - Extra care with work/private separation
   - No sharing by default

## References

- Related specs: `voice-capture-spec.md`, `data-storage-spec.md`, `work-private-separation-spec.md`, `notes-inbox-spec.md`
- Research: Addiction psychology, habit loop interruption, compassionate design
- Design inspiration: I Am Sober, Quit Genius, recovery-oriented apps
