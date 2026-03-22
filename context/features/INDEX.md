# Drainiac Features Index

This directory contains detailed specifications for all features to be implemented in Drainiac.

## Implementation Priority

### Phase 1: Foundation
1. **[Authentication](./authentication-spec.md)** — BetterAuth with Google OAuth for single-user access
2. **[Data Storage](./data-storage-spec.md)** — SQLite with Drizzle ORM for local-first data
3. **[Work/Private Separation](./work-private-separation-spec.md)** — Core architectural pattern for data isolation
4. **[PWA Setup](./pwa-setup-spec.md)** — Progressive Web App configuration for offline capability and installation

### Phase 2: Core Capture
5. **[Voice-First Capture](./voice-capture-spec.md)** — Primary input mechanism with Web Speech API and AI intent detection

### Phase 3: Processing Modules
6. **[Gamified To-Do List](./todo-list-spec.md)** — Rewarding task management system
7. **[Reading & Watch List](./media-queue-spec.md)** — Media queue with "What's next?" picker
8. **[Notes, Ideas & Free Thoughts](./notes-inbox-spec.md)** — Flexible inbox for miscellaneous thoughts
9. **[Habit & Impulse Control Tracker](./habit-tracker-spec.md)** — Compassionate habit-breaking support

## Feature Dependencies

```
Foundation Layer:
├── authentication-spec.md (required first)
├── data-storage-spec.md (required first)
├── work-private-separation-spec.md (required first)
└── pwa-setup-spec.md (can be parallel with others)

Capture Layer:
└── voice-capture-spec.md (depends on: data-storage, work-private-separation)

Processing Layer (can be built in parallel):
├── todo-list-spec.md (depends on: voice-capture, data-storage, work-private-separation)
├── media-queue-spec.md (depends on: voice-capture, data-storage, work-private-separation)
├── notes-inbox-spec.md (depends on: voice-capture, data-storage, work-private-separation)
└── habit-tracker-spec.md (depends on: voice-capture, data-storage, work-private-separation, notes-inbox)
```

## Specification Template

Each feature specification follows this structure:

- **Overview**: High-level description and purpose
- **Requirements**: Detailed functional and non-functional requirements
- **References**: Related documentation, specs, and inspiration sources

## Cross-Cutting Concerns

All features must respect:
- Work/private bucket separation
- Offline-first capability
- Voice capture integration
- Mobile-first responsive design
- Accessibility standards
- Performance budgets
- Privacy and security

## Future Enhancements

See `project-overview.md` for additional features under consideration:
- End-of-day/weekly review mode
- Zen mode
- Export/backup functionality
- Mood/energy check-in integration
- Social accountability features
