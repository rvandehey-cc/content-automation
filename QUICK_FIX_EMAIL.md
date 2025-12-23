# Quick Fix: Email Confirmation Error

## Easiest Solution (Recommended for Development)

**Disable email confirmation in Supabase:**

1. Go to: https://supabase.com/dashboard/project/ggrucwtukdpbvujxffbc/auth/settings

2. Scroll to **"Auth"** section

3. Find **"Enable email confirmations"** toggle

4. **Turn it OFF** (disable)

5. Click **Save**

That's it! Now users can sign up and login immediately without email confirmation.

## What This Changes

- Users can sign up and login immediately
- No email confirmation required
- Perfect for development and testing
- You can re-enable it later for production

## Test It

1. Go to: http://localhost:3000/auth/signup
2. Create an account
3. You should be logged in immediately and redirected

The signup page has been updated to automatically redirect users when email confirmation is disabled.
