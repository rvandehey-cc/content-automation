# Quick Start Guide

## Authentication Setup

### 1. Configure Environment Variables

Add these to your `.env` file (they're already in `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://ggrucwtukdpbvujxffbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_sr3qtZu5QGZHGlVudcU82w_u8bgFkKl
```

### 2. Enable Supabase Auth (One-time setup)

1. Go to: https://supabase.com/dashboard/project/ggrucwtukdpbvujxffbc/auth/providers
2. **Email** provider should be enabled by default
3. (Optional) Disable email confirmation for easier development:
   - Go to: Authentication → Settings
   - Toggle off "Enable email confirmations"

### 3. Start the Development Server

```bash
npm run dev:web
```

### 4. Create Your First Account

1. Visit: http://localhost:3000/auth/signup
2. Enter your email and password
3. If email confirmation is enabled, check your email and click the link
4. If disabled, you'll be logged in immediately

### 5. Access Protected Routes

Once logged in, you can access:
- `/site-profiles` - Manage site configuration profiles
- `/` - Dashboard home

## How Authentication Works

- **Middleware Protection**: Routes starting with `/site-profiles` require authentication
- **Auto-redirect**: Unauthenticated users are redirected to `/auth/login`
- **Session Management**: Handled automatically by Supabase
- **Logout**: Click the logout button in the navigation bar

## Next Steps

1. Create a site profile at `/site-profiles`
2. Configure scraping settings for your site
3. Start building your automation workflows

For more details, see `AUTH_SETUP.md`
