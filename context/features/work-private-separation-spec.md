# Work/Private Separation — Feature Specification

## Overview

Implement a fundamental architectural pattern that separates all user data into two isolated buckets: "work" and "private". These environments exist completely separately with no content sharing between them, ensuring clear boundaries between professional and personal life.

## Requirements

### Functional Requirements

1. **Bucket System**
   - Two predefined buckets: `work` and `private`
   - Bucket selection persists across sessions
   - All user-generated content tagged with bucket
   - No cross-bucket queries or data access
   - Clear visual indication of current bucket

2. **Bucket Switching**
   - Easy toggle between work and private modes
   - Confirmation prompt when switching (optional)
   - Remember last active bucket per device (optional)
   - Keyboard shortcut for switching
   - Preserve in-progress captures when switching

3. **Data Isolation**
   - Database queries filtered by bucket
   - Search scoped to active bucket
   - Statistics/analytics separated by bucket
   - No "all buckets" view
   - API endpoints respect bucket context

4. **UI Context**
   - Persistent bucket indicator (header/nav)
   - Different theme colors per bucket (subtle):
     - Work: professional blue/gray
     - Private: warmer personal colors
   - Bucket name in page title
   - Breadcrumbs show current bucket
   - Empty states reference correct bucket

5. **Voice Capture Context**
   - Captured thoughts go to active bucket
   - Voice command to specify bucket (optional): "Work todo..." or "Private note..."
   - Cannot move thoughts between buckets (intentional limitation)

6. **Default Bucket**
   - User preference for default bucket
   - Smart defaults based on time/location (future consideration)
   - Device-specific defaults (work laptop vs personal phone)

7. **Bucket Management**
   - View storage usage per bucket
   - Export data per bucket
   - Clear all data in a bucket (with confirmation)
   - Cannot rename or delete buckets

### Non-Functional Requirements

1. **Data Integrity**
   - Guaranteed isolation at database level
   - Prevent accidental cross-bucket data leakage
   - Audit all queries for bucket filtering
   - Test coverage for isolation

2. **User Experience**
   - Obvious which bucket is active
   - Smooth switching (< 100ms)
   - No data loss during switch
   - Clear mental model

3. **Performance**
   - Bucket filtering adds minimal overhead
   - Indexed for efficient bucket queries
   - No N+1 queries from bucket filtering

4. **Security**
   - Extra protection for private bucket (future: encryption)
   - Bucket access logged for audit
   - Cannot bypass bucket restrictions

## References

- Related specs: ALL feature specs depend on this
- Multi-tenancy patterns (bucket = tenant)
- Data isolation best practices
