# Create Action

Create a feature spec in `context/features/` using the standard template.

1. Check $ARGUMENTS (after "create"):
   - If empty: Error — "create" requires a short feature name (e.g., `fix-post-login-auth`)

2. Derive the filename: `context/features/{name}.md`
   - If file already exists, show it and ask whether to overwrite

3. Gather information from the user (ask if not already provided):
   - Feature title (one line)
   - Priority (🔴 Critical, 🟡 Medium, 🔵 Low)
   - Problem description
   - Current state
   - Goals
   - How to test
   - Notes (dependencies, references, scope constraints)

4. Write the spec using this template:

```markdown
# {Title}

**Priority:** {priority}

## Problem

{What's broken or missing and why it matters}

## Current State

{How things work today — the context needed to implement}

## Goals

- {Measurable outcome 1}
- {Measurable outcome 2}

## Tests

- {How to verify goal 1}
- {How to verify goal 2}

## Notes

- **Ref:** {links to related docs, reviews, issues}
- **Deps:** {env vars, migrations, external services}
- **Scope:** {what's in and out of scope}
```

5. Show the created spec path and suggest `/skill:feature load {name}` to start working on it.
