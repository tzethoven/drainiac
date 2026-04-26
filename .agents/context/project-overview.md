# Drainiac — Project Overview

## Overview

**Drainiac** = personal productivity PWA. Core philosophy: **capture fast, process later** — frictionless way offload thoughts throughout day, return to them in structured, motivating environment.

Goal: **relieve mental load** & **optimise focus**. Takes away pressure of thoughts floating in head, enables focus on one thing at time, live in moment.

---

## Full Product Vision

Sections below describe complete product Drainiac will become. Phase 1 = first step toward this vision.

### Voice-First Capture

Primary input method = voice. User speaks thought, app uses Web Speech API + AI layer to detect intent, auto-route thought to right category.

**Code word system:** Optional trigger words at start of voice note signal intent explicitly, bypass AI inference for speed & reliability. Examples:

| Code word | Intent |
|---|---|
| `"Todo"` | Add to to-do list |
| `"Read"` | Add to reading list |
| `"Watch"` | Add to watch list |
| `"Note"` | Free-form thought / journal entry |
| `"Habit"` | Log a habit-related thought or urge |
| `"Idea"` | Log an interesting idea to be explored later |
| *(more to be defined)* | *(extensible)* |

When no code word used, AI infers intent from context, asks confirmation before filing thought.

### Content Consumption Use Case

A key scenario Drainiac is designed to support: **consuming a piece of content** (a book chapter, podcast episode, film, article, lecture, etc.) and wanting to capture findings, reactions, or ideas triggered by that content — without breaking focus.

**User scenario example:**
> User is reading chapter 3 of a book. A concept sparks an idea. They hold the record button and say: *"Idea — habit stacking can apply to my morning routine"*. The capture is instant, frictionless, and linked to no particular source. Later, during end-of-day processing, they can review and connect that idea back to the content that inspired it.

**Why this matters:**
- Consuming content is a primary moment when new ideas and todos surface
- Interrupting consumption to write notes in another tool breaks focus
- Drainiac acts as the "capture inbox" while the user stays in the flow of the content

**How it fits the existing system:**
- Voice capture with code words (`Idea`, `Note`, `Todo`) is already the right tool for this scenario
- The captured thought lands in the appropriate category (ideas, notes, todos) with no extra steps
- No special mode needed — the existing capture flow handles this naturally

**Future opportunity:** A lightweight "content session" mode where the user nominates what they are consuming (e.g. links to a reading/watch item) and all captures during that session are automatically tagged with that source. See `docs/future-enhancements.md` for details.

### Thought Processing Interface

Structured dashboard where captured thoughts reviewed & acted on. Composed of several modules:

**Gamified To-Do List** — Task manager designed to make completion *feel good*. Visual progress feedback, priority/due date support, satisfying completion interactions, gamification mechanics (XP, streaks, levels).

**Reading & Watch List** — Curated media queue for books, films, articles, podcasts. Features "What's next?" picker to reduce decision fatigue, source tracking, status tracking (queued / in progress / done).

**Ideas, Notes, Feelings & Free Thoughts** — Lightweight inbox for uncategorised thoughts. Supports tagging, search, exploration of thoughts/feelings, promotion to other categories, potentially AI-assisted summarisation.

All entries stored in either **work** or **private** bucket. Two environments fully isolated.

### Habit & Impulse Control Tracker

Dedicated module focused on **breaking addictive or unwanted behaviours**, not just tracking good ones. Design philosophy = compassionate, non-punishing, offers alternatives.

Core features:
- Define habits to avoid, each with configured alternative suggestion
- Urge logging with immediate alternative suggestions
- Streak tracking with recovery-aware messaging (no shame for breaking streak)
- Optional: pattern detection, reflection prompts, post-regression reflection

---

## Technical Considerations

- **App type:** Progressive Web App (PWA) — installable, offline-capable, mobile-friendly
- **Frontend framework:** SvelteKit (Svelte 5)
- **Backend / data layer:** local-first with zero-sync
- **Authentication:** BetterAuth with Google OAuth (single user)
- **Speech-to-text:** Web Speech API
- **Data storage:** SQLite with Drizzle ORM (localStorage for Phase 1)
- **Notifications / reminders:** Via Web Push API

---

## Design Principles

1. **Capture is sacred** — getting thought into app must never take more than few seconds
2. **No overwhelm** — processing interface shows one thing at time where possible
3. **Compassion over discipline** — especially in habit tracker; tone = supportive, not punishing
4. **Extensible categories** — code word system & category list should be easy to expand as new use cases emerge
5. **Separation of work and private life** — work & private entries stored & interacted with in two isolated environments
6. **Minimise time spent in app** — user delegates tasks to app so they can complete tasks in real world
7. **Don't interrupt the flow** — especially during content consumption; capture must be so fast that the user never loses their place in what they were doing

---



## Future Considerations

- [ ] End-of-day or weekly review mode
- [ ] Zen mode
- [ ] Export / backup
- [ ] Mood or energy check-in integration
- [ ] Social accountability features (optional sharing)
