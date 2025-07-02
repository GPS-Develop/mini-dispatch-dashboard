# Supabase Configuration Guide

## 1. Run the User Roles Migration

First, run the SQL migration in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content from user-roles-migration.sql
```

**Important:** Before running the migration, update line 37 in the migration file to set your admin emails:

```sql
-- 6. Update specific emails to admin role (REPLACE WITH YOUR ADMIN EMAILS)
UPDATE public.users
SET role = 'admin'
WHERE email IN ('your-admin-email@example.com', 'another-admin@example.com');
```

## 2. Disable Public Signup

In your Supabase Dashboard:

1. Go to **Authentication** → **Settings**
2. Scroll down to **User Signups**
3. **Disable** the "Enable email signups" toggle
4. This ensures only invited users can create accounts

## 3. Configure Email Settings (if not already done)

1. Go to **Authentication** → **Settings** → **Email Templates**
2. Configure your SMTP settings or use Supabase's built-in email service
3. Customize the "Invite user" email template if desired

## 4. Environment Variables

Make sure you have these environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## 5. Test the Setup

1. **Create your first admin:**
   - If you already have an account, update your role manually in the database
   - Or run the UPDATE query in step 1 with your email

2. **Test admin invitation:**
   - Login as an admin
   - Go to "Invite Admin" in the sidebar
   - Send an invitation to a test email
   - Check that the invitation email is received
   - Complete the signup process

3. **Verify role-based access:**
   - Ensure admins can access all admin features
   - Ensure drivers are restricted to driver routes only
   - Ensure non-authenticated users are redirected to login

## 6. Row Level Security Policies

The migration automatically creates RLS policies for:
- Users can read their own data
- Admins can read all user data
- Admins can update user roles
- Admins can insert new users (for invites)

## 7. Troubleshooting

**If you get "Only admins can invite other admins" error:**
- Check that your user has `role = 'admin'` in the `users` table
- Verify the RLS policies are applied correctly

**If invited users can't sign up:**
- Ensure "Enable email signups" is disabled in Supabase Auth settings
- Check that the service role key is correctly set in environment variables

**If role assignment fails:**
- Check the database trigger is working: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Verify the `handle_new_user()` function exists and is working 