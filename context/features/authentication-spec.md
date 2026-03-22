# Authentication — Feature Specification

## Overview

Implement user authentication using BetterAuth with Google OAuth for a single-user application. Authentication protects personal data and enables future sync capabilities while keeping the setup simple for the primary use case.

## Requirements

### Functional Requirements

1. **BetterAuth Integration**
   - Install and configure BetterAuth
   - Set up database schema for auth tables
   - Configure session management
   - Implement CSRF protection
   - Set up secure cookie handling

2. **Google OAuth**
   - Register app with Google Cloud Console
   - Configure OAuth 2.0 credentials
   - Implement Google OAuth flow
   - Handle OAuth callbacks
   - Store user profile data (name, email, avatar)

3. **Single User Support**
   - First authenticated user becomes the app owner
   - Block additional user registrations
   - Display appropriate message to additional login attempts
   - Admin override mechanism (environment variable or config)

4. **Session Management**
   - Persistent sessions across browser restarts
   - Configurable session duration
   - Remember me option
   - Logout functionality
   - Auto-logout on prolonged inactivity (optional)

5. **Authentication States**
   - Loading state during auth check
   - Authenticated state with user info
   - Unauthenticated state with login prompt
   - Error states with helpful messages
   - Redirect handling for protected routes

6. **Protected Routes**
   - Middleware to protect app routes
   - Redirect to login when unauthenticated
   - Redirect to app when authenticated and accessing login
   - Handle deep linking after authentication

### Non-Functional Requirements

1. **Security**
   - Secure token storage
   - HTTPS enforcement in production
   - Secure session cookies (httpOnly, secure, sameSite)
   - Rate limiting on auth endpoints
   - Protection against common auth vulnerabilities

2. **Performance**
   - Fast auth state checking (< 100ms)
   - Minimal impact on initial page load
   - Efficient session validation

3. **User Experience**
   - Smooth OAuth redirect flow
   - Clear loading states
   - Helpful error messages
   - One-click Google login
   - Seamless session persistence

4. **Privacy**
   - Minimal data collection
   - Clear privacy policy for OAuth
   - Transparent data usage
   - GDPR considerations (if applicable)

## References

- BetterAuth documentation: https://better-auth.vercel.app/
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Related specs: `data-storage-spec.md`, `pwa-setup-spec.md`
- Security best practices: OWASP Authentication Cheat Sheet
