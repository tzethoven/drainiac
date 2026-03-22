# Drainiac

A personal productivity progressive web app with voice-first capture and compassionate task management.

**Core Philosophy**: Capture fast, process later.

## Overview

Drainiac helps you relieve mental load and optimize focus by providing a frictionless way to offload thoughts throughout the day and return to them in a structured, motivating environment.

### Features

- **Voice-First Capture**: Speak your thoughts, automatically routed to the right category
- **Gamified To-Do List**: Task management that feels rewarding
- **Media Queue**: "What's next?" picker for books, films, articles, and more
- **Notes & Ideas Inbox**: Flexible space for thoughts that don't fit structured categories
- **Habit Tracker**: Compassionate impulse control and habit-breaking support
- **Work/Private Separation**: Complete isolation between professional and personal data

## Tech Stack

- **Framework**: SvelteKit 5
- **Database**: SQLite with Drizzle ORM
- **Authentication**: BetterAuth with Google OAuth
- **Styling**: Component-scoped CSS
- **PWA**: Offline-capable progressive web app

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Google account for OAuth setup

### Installation

1. **Clone and install dependencies**

```bash
npm install
```

2. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and set:
- `ORIGIN`: Your development URL (default: `http://localhost:5173`)
- `BETTER_AUTH_SECRET`: A secure random string (32+ characters)
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

3. **Set up Google OAuth**

Follow the detailed guide in [docs/AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md) to configure Google OAuth authentication.

4. **Initialize the database**

```bash
npm run db:migrate
```

5. **Start the development server**

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

## Development Scripts

```bash
# Development server
npm run dev

# Type checking
npm run check
npm run check:watch

# Linting and formatting
npm run lint
npm run format

# Testing
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:e2e       # E2E tests with Playwright

# Database
npm run db:generate    # Generate new migration
npm run db:migrate     # Apply migrations
npm run db:push        # Push schema (development only)
npm run db:studio      # Open Drizzle Studio

# Build
npm run build
npm run preview        # Preview production build
```

## Project Structure

```
/workspace
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── auth.ts           # BetterAuth configuration
│   │   │   ├── auth-helpers.ts   # Route protection helpers
│   │   │   └── db/               # Database schema and connection
│   ├── routes/
│   │   ├── login/                # Login page
│   │   ├── app/                  # Protected app routes
│   │   └── +page.server.ts       # Root redirect logic
│   └── hooks.server.ts           # SvelteKit hooks
├── context/
│   ├── features/                 # Feature specifications
│   ├── project-overview.md       # Project description
│   └── coding-standards.md       # Code conventions
├── docs/
│   └── AUTHENTICATION_SETUP.md   # OAuth setup guide
└── drizzle/                      # Database migrations
```

## Authentication

The app uses Google OAuth for authentication with single-user enforcement. This is configured by keeping the OAuth app in "Testing" mode and only allowing specific test users.

See [docs/AUTHENTICATION_SETUP.md](./docs/AUTHENTICATION_SETUP.md) for detailed setup instructions.

## Database Schema

The database uses SQLite with Drizzle ORM. Schema is defined in `src/lib/server/db/schema.ts`.

Current tables:
- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth account links
- `verification` - Email verification tokens
- `task` - To-do items (placeholder for future implementation)

## Contributing

This is a personal productivity app, but contributions and suggestions are welcome!

## License

Private project - all rights reserved.
