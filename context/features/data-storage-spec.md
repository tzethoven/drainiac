# Data Storage — Feature Specification

## Overview

Implement local-first data storage using SQLite with Drizzle ORM. The system prioritizes offline capability and fast local operations, with future considerations for optional sync.

## Requirements

### Functional Requirements

1. **SQLite Setup**
   - Configure SQLite for SvelteKit/Node environment
   - Set up database initialization
   - Implement database versioning/migrations
   - Handle database file location and permissions
   - Database backup strategy

2. **Drizzle ORM Integration**
   - Install and configure Drizzle ORM
   - Define TypeScript-first schema
   - Set up migrations system
   - Configure Drizzle Studio for development
   - Type-safe query builder integration

3. **Database Schema**
   - **Users table**: id, email, name, avatar_url, created_at
   - **Thoughts table**: id, user_id, content, transcription, intent, category, bucket (work/private), status, created_at, processed_at
   - **Tasks table**: id, user_id, title, description, priority, due_date, completed_at, bucket, xp_value, created_at
   - **Media table**: id, user_id, title, type, source, status, url, notes, bucket, created_at, completed_at
   - **Notes table**: id, user_id, content, type, status, bucket, created_at, updated_at
   - **Note_tags table**: note_id, tag
   - **Habits table**: id, user_id, name, description, alternatives (JSON), bucket, created_at
   - **Urges table**: id, habit_id, intensity, context, action_taken, alternative_used, logged_at
   - **Habit_actions table**: id, habit_id, action_type, timestamp
   - Add indexes for common queries
   - Add foreign key constraints

4. **Data Access Layer**
   - Repository pattern for each entity type
   - Typed CRUD operations
   - Transaction support for complex operations
   - Bulk operations where needed
   - Soft delete support (for undo functionality)

5. **Work/Private Bucket Separation**
   - Bucket field on all user data tables
   - Query filtering by bucket
   - UI context switching
   - No cross-bucket data leakage
   - Analytics/aggregations respect bucket separation

6. **Local-First Architecture**
   - All operations work offline
   - Optimistic UI updates
   - Operation queue for eventual sync (future)
   - Conflict resolution strategy (future)
   - Export functionality

### Non-Functional Requirements

1. **Performance**
   - Fast queries (< 50ms for typical operations)
   - Efficient indexes for common access patterns
   - Connection pooling if needed
   - Lazy loading for large datasets
   - Pagination support

2. **Data Integrity**
   - Foreign key constraints
   - NOT NULL constraints on required fields
   - Unique constraints where appropriate
   - Transaction support for multi-step operations
   - Data validation before insert/update

3. **Scalability**
   - Handle thousands of entries per table
   - Efficient full-text search
   - Archive old data strategy
   - Database size monitoring

4. **Maintainability**
   - Clear migration history
   - Schema documentation
   - Type safety throughout
   - Easy to add new tables/fields
   - Version migrations

5. **Backup & Recovery**
   - Automated local backups
   - Export to JSON/CSV
   - Import from backup
   - Data corruption detection (future)

## References

- SQLite documentation: https://www.sqlite.org/docs.html
- Drizzle ORM: https://orm.drizzle.team/
- Local-first software principles: https://www.inkandswitch.com/local-first/
- Related specs: `authentication-spec.md`, `work-private-separation-spec.md`
