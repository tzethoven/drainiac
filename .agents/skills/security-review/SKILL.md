---
name: security-review
description: Scans the codebase for security vulnerabilities including missing authentication, unprotected server endpoints, exposed env variables, injection risks, and insecure form actions. Use when implementing new features, before merges, or for periodic security audits. Pass an optional folder path to scope the review, or 'feature' to review only the current feature branch diff.
argument-hint: [folder path | feature]
---

# Security Review

Scan the codebase (or specified scope) for security vulnerabilities. Report findings grouped by severity with specific file locations.

**Do not automatically fix any issues.** Present all findings to the user and let them decide which ones to address.

## Scope

Determined by $ARGUMENTS:

- **No argument** — full codebase scan
- **Folder path** (e.g. `src/lib/components/capture`) — scan that folder only
- **`feature`** — scan only files changed in the current feature branch vs `preview`:
  ```bash
  git diff preview...HEAD --name-only   # changed files
  git diff preview...HEAD               # full diff
  ```
  Only report issues in new or modified lines. You may read surrounding code for context.

## Auth Stack

This project will use **BetterAuth** with Google OAuth (single user, post-Phase 1).

**Phase 1 (current)**: No authentication — localStorage only, single-user on single device.

When auth is implemented:
- Session checks in `src/hooks.server.ts` for server-side route protection
- Session validation in form actions and `+page.server.ts` load functions
- Public environment variables prefixed with `PUBLIC_`

## What to Check

### 1. Authentication & Session (Post-Phase 1)

- **Unprotected server endpoints**: Every `+server.ts` endpoint that handles sensitive data must verify the session. Flag any that skip auth.
- **Unprotected form actions**: Actions in `+page.server.ts` that modify data must verify the user session before processing.
- **Unprotected load functions**: `+page.server.ts` load functions that access user data must verify session.
- **Server hooks coverage**: Verify `src/hooks.server.ts` properly intercepts requests that need auth. Check that public routes are explicitly allowed.
- **Session data trust**: Flag places where session user data is used for authorization without validation.

### 2. Authorization & Access Control (Post-Phase 1)

- **Missing ownership checks**: After auth, verify that resources are scoped to the user. Flag queries that accept IDs from user input without verifying ownership.
- **IDOR vulnerabilities**: Flag places where user-supplied IDs (from params or form data) are used directly in database lookups without ownership verification.

### 3. Environment Variables

- **Secrets in `PUBLIC_`**: Any `PUBLIC_` variable is shipped to the browser. Flag API keys, secrets, or tokens exposed this way. Acceptable: analytics IDs, feature flags, public API endpoints.
- **Hardcoded secrets**: Search for API keys, tokens, passwords, or connection strings hardcoded in source files.
- **Missing env validation**: Check if critical env vars are validated at startup or could silently be `undefined`.
- **`.env` in version control**: Verify `.env` is in `.gitignore`.

### 4. Input Validation

- **Unvalidated user input**: Form actions and API endpoints should validate input with Zod (or equivalent) before processing. Flag raw form data used without validation.
- **SQL injection**: Check for string interpolation in database queries instead of parameterized queries (Drizzle ORM handles this, but check raw SQL if any).
- **Path traversal**: Flag any file operations using user-supplied paths without sanitization.
- **XSS risks**: Check for unsanitized user content rendered as HTML (use `{@html}` safely or use DOMPurify).

### 5. API Endpoint Security

- **Missing rate limiting**: Flag sensitive endpoints (auth, AI interactions, uploads) that lack rate limiting.
- **CORS misconfiguration**: Check for overly permissive CORS headers in `+server.ts` files.
- **Webhook verification**: If webhooks exist, verify request signatures.
- **Cron route protection**: Check that cron-triggered endpoints verify a secret or are protected from public access.

### 6. Data Exposure

- **Over-fetched data**: Server load functions or API endpoints that return full database objects to the client instead of selecting specific fields. Sensitive fields (tokens, internal IDs) may leak.
- **Error message leakage**: Check that error responses don't expose stack traces, database errors, or internal paths in production.
- **Logging sensitive data**: Flag `console.log` statements that log passwords, tokens, or PII.

### 7. File Upload & Storage (Future)

- **Unrestricted file types**: Check that file upload endpoints validate file type and size.
- **Public blob URLs**: Check if stored file URLs are publicly accessible without auth.

### 8. Client-Side Storage

- **Sensitive data in localStorage**: Flag if passwords, tokens, or unencrypted PII are stored in localStorage.
- **localStorage without validation**: Flag if data read from localStorage is used without validation (could be tampered with).

### 9. PWA & Service Worker

- **Service worker cache poisoning**: Verify service worker caching strategies don't cache sensitive data.
- **Service worker updates**: Check that service workers are properly versioned and updated.
- **Offline fallbacks**: Verify offline fallbacks don't expose sensitive data.

### 10. Dependency & Config

- **Dangerous `{@html}`**: Flag usage without sanitization (DOMPurify or equivalent).
- **Missing security headers**: Check `src/hooks.server.ts` for security headers (CSP, X-Frame-Options, etc.).
- **Outdated dependencies**: Check for known vulnerabilities (can suggest `npm audit`).

## Analysis Process

1. **Map the attack surface** — List all API endpoints (`+server.ts`), form actions, load functions, and server hooks.
2. **Check auth coverage** — Verify every sensitive entry point has session validation (when auth is implemented).
3. **Scan env files** — Audit `PUBLIC_*` variables and check for hardcoded secrets.
4. **Review input handling** — Check form actions and API endpoints for input validation.
5. **Check data flow** — Trace user input from client to storage, flag unvalidated paths.
6. **Review storage** — Check localStorage usage, service worker caching.

## Output

Provide findings in this format:

```markdown
# Security Review

**Date:** YYYY-MM-DD
**Scope:** [folder or "full codebase"]
**Auth Status:** [Phase 1 - No auth | Post-Phase 1 - BetterAuth]

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟡 Warning  | X |
| 🔵 Info     | X |

---

## 🔴 Critical

### [Title]

**File:** `path/to/file.ts` (lines X-Y)
**Issue:** Description of the vulnerability
**Risk:** What an attacker could do
**Fix:**
\```typescript
// Remediation code
\```

---

## 🟡 Warning

(Same format)

## 🔵 Info

(Same format)
```

### Severity Guide

- **🔴 Critical** — Exploitable now: missing auth on sensitive endpoints, exposed secrets, injection vulnerabilities, IDOR, XSS
- **🟡 Warning** — Defense gap: missing validation, no rate limiting, overly permissive access, data over-exposure
- **🔵 Info** — Hardening opportunity: missing headers, loose config, best practice gaps, dependency updates

## Rules

- Only flag **real issues** with specific file paths and line numbers
- Provide **working remediation code** for Critical and Warning findings
- Don't flag test files or dev-only code
- Don't flag `PUBLIC_` analytics/tracking IDs as secrets
- Match existing project patterns in remediation suggestions
- For Phase 1, acknowledge that auth is not yet implemented but flag patterns that will be problematic post-auth
