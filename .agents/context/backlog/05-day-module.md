# Day module

"What counts as today?" is load-bearing for streaks, the end-of-day prompt, and EOD queue construction — and it's implemented inconsistently across two files. `progress-store` has `getTodayDateString`, `getDateString`, and a 3-hour-after-midnight grace period inside `updateStreak`. `end-of-day-store` duplicates `getTodayDateString`, adds `shouldShowPrompt` (`hour >= 20`), and `wasCompletedToday`. `buildQueue` does ad-hoc `new Date(...).toISOString().split('T')[0]` inline.

The grace period exists in one place but not the other. If the user travels time zones, or the product adds the "weekly review" from the future-enhancements list, this will bite.

**Deepening:** a small `Day` module that owns "today", "yesterday", the grace window, and "is it evening yet?". Tiny interface, many callers — high leverage.

**Wins:** one place defines "a day" for streaks, EOD, and future review modes; callers stop reaching for raw `Date` arithmetic; injectable clock makes the whole grace-period + streak behaviour testable with fake times.
