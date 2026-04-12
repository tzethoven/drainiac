# Start Action

1. Read current-feature.md - verify Goals are populated
2. If empty, error: "Run /feature load first"
3. Set Status to "In Progress"
4. Create and checkout the feature branch using the naming convention from workflow rules:
   - `[developer]/feat-[linear ID]-[feature]` for features
   - `[developer]/fix-[linear ID]-[fix]` for fixes
   - Derive the name from the H1 heading and Linear ID in current-feature.md
   - Branch off `staging`
5. List the goals, then implement them one by one
