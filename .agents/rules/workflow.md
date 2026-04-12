# Workflow Rules

Follow this workflow for every feature or fix. These rules take priority over any skill instructions.

## Step-by-Step Workflow

1. **Document** — Document the feature in `context/current-feature.md`
2. **Branch** — Create new branch off `staging`
   - Branch naming: `[developer]/feat-[linear ID]-[feature]` or `[developer]/fix-[linear ID]-[fix]`
3. **Implement** — Implement per `context/current-feature.md`
4. **Test**
   - Write unit tests for new/modified server actions and utilities (`npm run test`)
   - Verify it works in the browser — tell the user what to check
   - Run `npm run build` and fix any errors
5. **Iterate** — Make changes if needed
6. **Commit** — Only after tests + build pass. **Always ask the user before committing.**
7. **Docs** — Update domain docs, `CHANGELOG.md`, and reset `current-feature.md` — commit all together
8. **Hand off** — Notify the user the branch is ready to push and review

## Commits

- **Always ask the user before committing** — never auto-commit, even when following a skill's steps
- Use conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, etc.
- Keep commits focused — one feature or fix per commit

## Branching

- **NEVER** commit directly to `main` or `staging` — work on feature branches only
- **NEVER** merge anything into `main` or `staging`
- **NEVER** create PRs on GitHub — that is the user's responsibility
- The user handles pushing, the PR, and the merge
- You may checkout `main` or `staging` to branch off them, but never commit to them
- Promotion flow: feature branch → PR → `staging` → `main` (production)
- **Ask the user before deleting any branch**

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the spec
- Never delete files without clarification
- If something isn't working after 2–3 attempts, stop and explain the issue — don't keep trying random fixes
- Ask for clarification if requirements are unclear
