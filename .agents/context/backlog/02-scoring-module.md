# Scoring / Actions module

XP, level, and streak policy is scattered across `progress-store` (`calculateTodoXP`, `calculateLevel`, `updateStreak`, grace period), `media-store` (`calculateXP` via config), `reading-store` / `watch-store` (per-type formulas), and the UI pages, which must call `toggleComplete` *then* `awardTodoXP` in the right order and open the level-up modal if the result says so.

The scoring rules are a cross-cutting concern, but each store owns a slice and the view stitches them together. `progress-store.awardTodoXP` is also coupled to todo-domain details (priority) rather than taking an event.

**Deepening:** an `Actions` layer (`completeTodo(id)`, `completeReading(id, rating)`, `finishEndOfDay(...)`) that owns "do the state change, then apply the scoring rule". Stores emit primitive mutations; `Scoring` is the seam where XP/streak/level rules live.

**Wins:** changing the XP curve or streak grace period is one file; UI pages drop ~30 lines each and stop needing to remember the ordering; scoring rules become unit-testable end-to-end.
