# Drainiac — Project Overview

## Overview

**Drainiac** is a personal productivity progressive web app (PWA). Its core philosophy is **capture fast, process later** — giving the user a frictionless way to offload thoughts throughout the day and return to them in a structured, motivating environment.

The goal of the app is to **relieve mental load** and **optimise focus**. It takes away the pressure of all the thoughts floating through your head and enables you to focus on one thing at a time and live in the moment.

---

## Core Features

### 1. Voice-First Capture

The primary input method is voice. The user speaks a thought, and the app uses Web Speech API combined with Claude API to detect intent and automatically route the thought to the right category.

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

---

### 2. Thought Processing Interface

A structured dashboard where captured thoughts are reviewed and acted on. Composed of several modules:

#### ✅ Gamified To-Do List
A task manager designed to make completion *feel good*. Features include:
- Visual progress feedback
- Priority and due date support
- Satisfying completion interactions
- To be defined gamification mechanics e.g. XP points / streaks / level system

#### 📚 Reading & Watch List
A curated media queue for books, films, articles, podcasts, and other recommendations. Features include:
- "What's next?" picker — surfaces one recommendation at a time to reduce decision fatigue
- Source tracking (who recommended it, when)
- Status tracking: *queued → in progress → done*
- Ability to clear items from the queue, exact mechanic needs to be thought out more

#### 🗒️ Ideas, Notes, Feelings & Free Thoughts
A lightweight inbox for thoughts that don't fit a specific category. Supports:
- Tagging and search
- Ability to explore and process a thought or feeling
- When I reach closure, an ability to document the conclusion in some way 
- Promotion to other categories (e.g. "turn this note into a task")
- Possibly AI-assisted summarisation or clustering

All entries are stored either in the **work** or the **private** bucket. These two "environments" exist separately and no content should be shared between them.

---

### 3. Habit & Impulse Control Tracker

A dedicated module focused on **breaking addictive or unwanted behaviours**, not just tracking good ones. The design philosophy here is compassionate, non-punishing and offering alternatives.

Core features:
- Define habits to avoid, each with a configured *alternative suggestion* (e.g. "go for a short walk", "drink a glass of water", "open your reading list")
- **Urge logging:** When the user feels the impulse, they open the app, log the urge, and are immediately offered the pre-set alternative
- Streak tracking for avoidance, with recovery-aware messaging (no shame for breaking a streak)
- Optional: pattern detection — time of day, mood, triggers
- Optional: reflection prompts at end of day
- Optional: reflection after regression to bad habits

---

## Technical Considerations

- **App type:** Progressive Web App (PWA) — installable, offline-capable, mobile-friendly
- **Frontend framework:** Svelte 5
- **Backend / data layer:** local-first with zero-sync
- **Authentication:** BetterAuth with google OAuth and a single user
- **AI / NLP layer:** Start with Mistral AI, but make it easy to switch
- **Speech-to-text:** Web Speech API
- **Voice control:** WebMCP API
- **Data storage:** SQLite with drizzle ORM
- **Notifications / reminders:** Via Web Push API

---

## Design Principles

1. **Capture is sacred** — getting a thought into the app must never take more than a few seconds
2. **No overwhelm** — the processing interface shows one thing at a time where possible
3. **Compassion over discipline** — especially in the habit tracker; the tone is supportive, not punishing
4. **Extensible categories** — the code word system and category list should be easy to expand as new use cases emerge
5. **Separation of work and private life** — work and private entries are stored and interacted with in two isolated environments.
6. **Minimise time spent in app** - the user delegates tasks to the app so they can complete their tasks in the real world

---

## Design system

The design system can be found in @context/screenshots/design-system.png

---

## Future Considerations

- [ ] End-of-day or weekly review mode
- [ ] Zen mode
- [ ] Export / backup
- [ ] Mood or energy check-in integration
- [ ] Social accountability features (optional sharing)
