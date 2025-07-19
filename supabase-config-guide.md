# Supabase Configuration Guide

## 1. Run the Database Migration

First, run the complete SQL migration in your Supabase SQL Editor:

1. **Open the migration file:** `user-roles-migration.sql` in the project root
2. **Important:** Before running the migration, update section 14 to set your admin emails:

```sql
-- 14. Set Initial Admin Users
UPDATE public.users
SET role = 'admin'
WHERE email IN ('your-admin-email@example.com', 'another-admin@example.com');
```

3. **Copy the entire file content** and paste it into your Supabase SQL Editor
4. **Execute the migration** - this will create:
   - All required tables with proper relationships
   - Row Level Security (RLS) policies for data access control
   - Database triggers for user creation and activity logging
   - Functions for status updates and document management
   - Proper CASCADE DELETE relationships
   - Check constraints for data validation

## 2. Create Storage Bucket

Create the storage bucket for PDF documents:

1. Go to **Storage** in your Supabase dashboard
2. Click **Create a new bucket**
3. **Bucket name:** `load-pdfs`
4. **Public:** No (keep private)
5. Click **Create bucket**

## 3. Disable Public Signup

In your Supabase Dashboard:

1. Go to **Authentication** → **Settings**
2. Scroll down to **User Signups**
3. **Disable** the "Enable email signups" toggle
4. This ensures only invited users can create accounts

## 4. Configure Email Settings (if not already done)

1. Go to **Authentication** → **Settings** → **Email Templates**
2. Configure your SMTP settings or use Supabase's built-in email service
3. Customize the "Invite user" email template if desired

## 5. Environment Variables

Make sure you have these environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your production URL
```

## 6. Test the Setup

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

## 7. Row Level Security Policies

The migration automatically creates RLS policies for:
- Users can read their own data
- Admins can read all user data
- Admins can update user roles
- Admins can insert new users (for invites)

## 8. Troubleshooting

**If you get "Only admins can invite other admins" error:**
- Check that your user has `role = 'admin'` in the `users` table
- Verify the RLS policies are applied correctly

**If invited users can't sign up:**
- Ensure "Enable email signups" is disabled in Supabase Auth settings
- Check that the service role key is correctly set in environment variables

**If role assignment fails:**
- Check the database trigger is working: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Verify the `handle_new_user()` function exists and is working 