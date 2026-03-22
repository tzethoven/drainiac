# Authentication Setup Guide

This guide will help you configure Google OAuth authentication for Drainiac.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top and select "New Project"
3. Enter a project name (e.g., "Drainiac") and click "Create"

## Step 2: Enable Google OAuth

1. In your project, navigate to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace account)
3. Click **Create**

### Configure OAuth Consent Screen

Fill in the required fields:
- **App name**: Drainiac
- **User support email**: Your email
- **Developer contact information**: Your email
- Click **Save and Continue**

### Scopes

For basic authentication, you don't need to add any scopes. Click **Save and Continue**.

### Test Users

Since you want single-user access:
1. Click **Add Users**
2. Add your email address (the one you'll use to sign in)
3. Click **Save and Continue**

**Important**: When the app is in testing mode, only test users you've added can sign in. This naturally enforces single-user access. To allow additional users, you'd add them to the test users list.

## Step 3: Create OAuth Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Configure:
   - **Name**: Drainiac Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (development)
     - Your production domain when deploying
   - **Authorized redirect URIs**:
     - `http://localhost:5173/api/auth/callback/google` (development)
     - Your production callback URL when deploying
5. Click **Create**

## Step 4: Configure Environment Variables

Copy the **Client ID** and **Client Secret** from the credentials page.

Update your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

## Step 5: Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` and you should be redirected to the login page. Click "Continue with Google" to authenticate.

## Single-User Enforcement

The app enforces single-user access by keeping the OAuth app in **Testing** mode and only adding your email to the test users list. This means:

- Only you (and any explicitly added test users) can sign in
- No public registration is possible
- You maintain full control over who can access the app

## Security Notes

1. **Never commit `.env` to version control** - it's already in `.gitignore`
2. Keep your `BETTER_AUTH_SECRET` secure and use a high-entropy value in production
3. Use HTTPS in production for all OAuth callbacks
4. Consider rotating your client secret periodically

## Production Deployment

When deploying to production:

1. Add your production domain to **Authorized JavaScript origins**
2. Add your production callback URL to **Authorized redirect URIs**:
   - `https://yourdomain.com/api/auth/callback/google`
3. Update the `ORIGIN` environment variable in your production environment
4. Generate a new secure `BETTER_AUTH_SECRET` for production

## Troubleshooting

### "Access blocked: This app's request is invalid"

- Check that your redirect URI exactly matches what's configured in Google Cloud Console
- Ensure you've added your email to the test users list

### "Invalid redirect_uri parameter"

- Verify the callback URL in Google Cloud Console matches: `/api/auth/callback/google`
- Check that `ORIGIN` in `.env` matches your development URL

### Can't sign in after setting up

- Ensure database migrations have been applied: `npm run db:migrate`
- Check that all environment variables are set correctly
- Verify you're using the email address added as a test user
