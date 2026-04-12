# Drainiac — Project Overview

## Overview

**Drainiac** is a personal productivity progressive web app (PWA). Its core philosophy is **capture fast, process later** — giving the user a frictionless way to offload thoughts throughout the day and return to them in a structured, motivating environment.

The goal of the app is to **relieve mental load** and **optimise focus**. It takes away the pressure of all the thoughts floating through your head and enables you to focus on one thing at a time and live in the moment.

---

## Phase 1: Voice Capture MVP

The first deliverable is a minimal PWA focused purely on voice capture.

### Scope

- **PWA setup** — installable, mobile-friendly, offline-capable shell
- **Hold-to-record button** — a single prominent button that records the user's voice while pressed
- **Real-time transcription** — uses the Web Speech API to transcribe speech as the user talks, displaying the text live on screen
- **Persist transcriptions** — save completed transcriptions to localStorage

### Out of scope for Phase 1

- Authentication
- AI intent detection / code word routing
- Thought processing interface (todos, media queue, notes)
- Habit tracker
- Backend / database

---

## Full Product Vision

The sections below describe the complete product Drainiac will become. Phase 1 is the first step toward this vision.

### Voice-First Capture

The primary input method is voice. The user speaks a thought, and the app uses Web Speech API combined with an AI layer to detect intent and automatically route the thought to the right category.

**Code word system:** A set of optional trigger words at the start of a voice note signal intent explicitly, bypassing AI inference for speed and reliability. Examples:

| Code word | Intent |
|---|---|
| `"Todo"` | Add to to-do list |
| `"Read"` | Add to reading list |
| `"Watch"` | Add to watch list |
| `"Note"` | Free-form thought / journal entry |
| `"Habit"` | Log a habit-related thought or urge |
| `"Idea"` | Log an interesting idea to be explored later |
| *(more to be defined)* | *(extensible)* |

When no code word is used, the AI infers intent from context and asks for confirmation before filing the thought.

### Thought Processing Interface

A structured dashboard where captured thoughts are reviewed and acted on. Composed of several modules:

**Gamified To-Do List** — A task manager designed to make completion *feel good*. Visual progress feedback, priority/due date support, satisfying completion interactions, and gamification mechanics (XP, streaks, levels).

**Reading & Watch List** — A curated media queue for books, films, articles, podcasts. Features a "What's next?" picker to reduce decision fatigue, source tracking, and status tracking (queued / in progress / done).

**Ideas, Notes, Feelings & Free Thoughts** — A lightweight inbox for uncategorised thoughts. Supports tagging, search, exploration of thoughts/feelings, promotion to other categories, and potentially AI-assisted summarisation.

All entries are stored in either a **work** or **private** bucket. These two environments are fully isolated.

### Habit & Impulse Control Tracker

A dedicated module focused on **breaking addictive or unwanted behaviours**, not just tracking good ones. The design philosophy is compassionate, non-punishing, and offers alternatives.

Core features:
- Define habits to avoid, each with a configured alternative suggestion
- Urge logging with immediate alternative suggestions
- Streak tracking with recovery-aware messaging (no shame for breaking a streak)
- Optional: pattern detection, reflection prompts, post-regression reflection

---

## Technical Considerations

- **App type:** Progressive Web App (PWA) — installable, offline-capable, mobile-friendly
- **Frontend framework:** SvelteKit (Svelte 5)
- **Backend / data layer:** local-first with zero-sync
- **Authentication:** BetterAuth with Google OAuth (single user)
- **AI / NLP layer:** Start with Mistral AI, but make it easy to switch
- **Speech-to-text:** Web Speech API
- **Voice control:** WebMCP API
- **Data storage:** SQLite with Drizzle ORM (localStorage for Phase 1)
- **Notifications / reminders:** Via Web Push API

---

## Design Principles

1. **Capture is sacred** — getting a thought into the app must never take more than a few seconds
2. **No overwhelm** — the processing interface shows one thing at a time where possible
3. **Compassion over discipline** — especially in the habit tracker; the tone is supportive, not punishing
4. **Extensible categories** — the code word system and category list should be easy to expand as new use cases emerge
5. **Separation of work and private life** — work and private entries are stored and interacted with in two isolated environments
6. **Minimise time spent in app** — the user delegates tasks to the app so they can complete their tasks in the real world

---



## Future Considerations

- [ ] End-of-day or weekly review mode
- [ ] Zen mode
- [ ] Export / backup
- [ ] Mood or energy check-in integration
- [ ] Social accountability features (optional sharing)
