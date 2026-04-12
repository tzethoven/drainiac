# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Todo List Manager**: Dedicated `/todos` page for managing captured todos with full CRUD operations (complete, edit, delete, archive), priority levels, filter tabs, and manual entry form. Voice-captured todos (using "to do" code word) automatically sync to the todo list.
- **Reading & Watch Lists**: Dedicated `/reading` and `/watching` pages with status tracking (Queued/In Progress/Completed), "What's Next?" picker for decision-making, full CRUD operations, type selectors, 5-star ratings, and XP calculation. Voice-captured items automatically sync via dual-write.
- **UI Design System**: Comprehensive design system with CSS variables for spacing, typography, shadows, and animation timing. Dark mode with theme toggle (persists to localStorage), smooth page/list/modal animations, button press feedback, and respect for prefers-reduced-motion accessibility.
- **Gamified Todos**: XP rewards for completing todos (10 base, priority multipliers, +5 streak bonus), level progression system (Level = sqrt(XP/100) + 1), daily completion streaks with 3-hour grace period, progress dashboard with level badge/XP bar/streak indicator, satisfying completion animations (+XP float-up, level-up modal with confetti).

### Changed

### Fixed

### Removed

---

## [0.1.0] - 2026-04-12

### Added

- **Voice Capture MVP**: Hold-to-record button with real-time transcription using Web Speech API
- **Code Word Detection**: Automatic categorization of voice notes using trigger words (Todo, Read, Watch, Note, Idea, Habit)
- **PWA Support**: Progressive Web App with offline capability, service worker, and installable manifest
- **Transcription History**: localStorage-based persistence with category badges and filtering
