# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **End-of-Day Processing**: Evening ritual for reviewing captured items and celebrating daily accomplishments. Process uncategorized transcriptions, completed todos, and new media items one at a time in a calm, focused interface. Automatic 8 PM prompt when unprocessed items exist. Daily summary shows todos completed, XP earned, current streak, and level progress. Award +50 bonus XP for completing the ritual (once per day). Optional reflection note for journaling. Category-specific actions: assign category for transcriptions, archive/keep active for todos, start now/delete for media items. XP gain animation and level-up celebration on completion.
- **Todo List Manager**: Dedicated `/todos` page for managing captured todos with full CRUD operations (complete, edit, delete, archive), priority levels, filter tabs, and manual entry form. Voice-captured todos (using "to do" code word) automatically sync to the todo list.
- **Reading & Watch Lists**: Dedicated `/reading` and `/watching` pages with status tracking (Queued/In Progress/Completed), "What's Next?" picker for decision-making, full CRUD operations, type selectors, 5-star ratings, and XP calculation. Voice-captured items automatically sync via dual-write.
- **UI Design System**: Comprehensive design system with CSS variables for spacing, typography, shadows, and animation timing. Dark mode with theme toggle (persists to localStorage), smooth page/list/modal animations, button press feedback, and respect for prefers-reduced-motion accessibility.
- **Gamified Todos**: XP rewards for completing todos (10 base, priority multipliers, +5 streak bonus), level progression system (Level = sqrt(XP/100) + 1), daily completion streaks with 3-hour grace period, progress dashboard with level badge/XP bar/streak indicator, satisfying completion animations (+XP float-up, level-up modal with confetti).
- **Media Metadata Editing**: Edit modal for reading/watch items with fields for source (author/publication/platform), personal notes, and tags. Metadata displayed on item cards with emojis (📝 source, 💭 notes, 🏷️ tags). Comma-separated tag input with parsing, theme-aware modal, keyboard shortcuts (ESC), form validation.

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
