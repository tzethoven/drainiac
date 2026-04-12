# Complete Action

1. Run a final review to ensure everything is complete
2. Run pre-PR checks on the feature diff — present all findings to the user and let them decide which to address before proceeding:
   - `/security-review feature`
   - `/refactor feature`
   - `/code-quality feature`
3. Stage all code changes
4. **Ask the user before committing** — never auto-commit
5. Commit with a conventional commit message based on the feature (`feat:`, `fix:`, `chore:`, etc.)
6. Generate or update documentation:
   - Check `docs/domains/` for an existing domain doc the feature belongs to and update it. Only create a new doc for a genuinely new domain.
   - If the changes impact overall system architecture (new services, database changes, new patterns, auth changes, new routes), also update `docs/architecture.md`.
   - Update `CHANGELOG.md` — add an entry under `## [Unreleased]` in the appropriate section (`Added`, `Changed`, `Fixed`, `Removed`). Format: `- **[LINEAR-ID]**: Short user-facing description of what changed and why it matters`. Keep it user-facing.
7. Commit the documentation changes with `chore: update docs and changelog`:
   - Include all doc/changelog updates
   - Reset current-feature.md: change H1 back to `# Current Feature`, clear Goals and Notes, set Status to "In Review", add a one-paragraph summary to the END of the History section
8. **Stop here** — notify the user the branch is ready to push and raise a PR
