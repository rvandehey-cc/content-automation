# Authentication Setup

## Overview

Authentication is now enabled using **Supabase Auth**. Users must sign up and login before accessing the dashboard.

## Setup Required

### 1. Enable Supabase Auth

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ggrucwtukdpbvujxffbc/auth/providers
2. **Email Auth** should be enabled by default
3. Configure email templates if desired (Settings → Auth → Email Templates)

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ggrucwtukdpbvujxffbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_sr3qtZu5QGZHGlVudcU82w_u8bgFkKl
```

### 3. Configure Email Redirect (Optional)

In Supabase Dashboard → Authentication → URL Configuration:
- Set **Site URL** to: `http://localhost:3000` (for development)
- Set **Redirect URLs** to include: `http://localhost:3000/auth/callback`

## How It Works

1. **Sign Up**: Users create an account at `/auth/signup`
2. **Email Confirmation**: Supabase sends a confirmation email (can be disabled in dev)
3. **Login**: Users login at `/auth/login`
4. **Protected Routes**: Middleware protects routes like `/site-profiles`
5. **Session Management**: Handled automatically by Supabase

## Protected Routes

Currently protected:
- `/site-profiles` and all sub-routes

To add more protected routes, edit `src/middleware.js`:

```javascript
const protectedPaths = ['/site-profiles', '/runs', '/logs']
```

## Auth Pages

- `/auth/login` - Login page
- `/auth/signup` - Sign up page
- `/auth/callback` - OAuth callback handler

## User Experience

- Unauthenticated users trying to access protected routes are redirected to `/auth/login`
- After login, users are redirected back to the page they were trying to access
- Auth status is shown in the navigation bar
- Users can logout from the navigation

## Development Notes

- Email confirmation can be disabled in Supabase Auth settings for easier development
- Sessions are automatically refreshed via middleware
- Auth state is synced across tabs/windows
