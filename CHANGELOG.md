# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Todo List Manager**: Dedicated `/todos` page for managing captured todos with full CRUD operations (complete, edit, delete, archive), priority levels, filter tabs, and manual entry form. Voice-captured todos (using "to do" code word) automatically sync to the todo list.

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
