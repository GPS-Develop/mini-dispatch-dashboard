-- ========================================
-- Mini Dispatch Dashboard Database Migration
-- ========================================
-- This migration sets up the complete database schema for the dispatch management system
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. Create Users Table with Role Management
-- ========================================

-- Users table for role-based access control
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'driver')) DEFAULT 'driver',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all user data" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert new users" ON public.users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 2. Create Drivers Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone BIGINT NOT NULL,
  email TEXT,
  status TEXT CHECK (status IN ('Available', 'On Load')) DEFAULT 'Available',
  pay_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  driver_status TEXT CHECK (driver_status IN ('active', 'inactive')) DEFAULT 'active',
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drivers table
CREATE POLICY "Drivers can read their own data" ON public.drivers
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can read all driver data" ON public.drivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage drivers" ON public.drivers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 3. Create Brokers Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.brokers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  contact BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read brokers" ON public.brokers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage brokers" ON public.brokers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 4. Create Loads Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.loads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id TEXT NOT NULL,
  pickup_address TEXT,
  pickup_state TEXT,
  pickup_datetime TIMESTAMP WITH TIME ZONE,
  delivery_address TEXT,
  delivery_state TEXT,
  delivery_datetime TIMESTAMP WITH TIME ZONE,
  load_type TEXT CHECK (load_type IN ('Reefer', 'Dry Van', 'Flatbed')),
  temperature NUMERIC(5,2),
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  notes TEXT,
  broker_name TEXT,
  broker_contact BIGINT,
  broker_email TEXT,
  status TEXT CHECK (status IN ('Scheduled', 'In-Transit', 'Delivered')) DEFAULT 'Scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loads table
CREATE POLICY "Drivers can read their assigned loads" ON public.loads
  FOR SELECT USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all loads" ON public.loads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage loads" ON public.loads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Drivers can update their load status" ON public.loads
  FOR UPDATE USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
    )
  );

-- ========================================
-- 5. Create Pickups Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.pickups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID REFERENCES public.loads(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pickups table (inherit from loads)
CREATE POLICY "Pickups access follows load access" ON public.pickups
  FOR ALL USING (
    load_id IN (
      SELECT id FROM public.loads
    )
  );

-- ========================================
-- 6. Create Deliveries Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID REFERENCES public.loads(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  datetime TIMESTAMP WITH TIME ZONE NOT NULL
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliveries table (inherit from loads)
CREATE POLICY "Deliveries access follows load access" ON public.deliveries
  FOR ALL USING (
    load_id IN (
      SELECT id FROM public.loads
    )
  );

-- ========================================
-- 7. Create Lumper Services Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.lumper_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID REFERENCES public.loads(id) ON DELETE CASCADE NOT NULL,
  no_lumper BOOLEAN DEFAULT false,
  paid_by_broker BOOLEAN DEFAULT false,
  paid_by_company BOOLEAN DEFAULT false,
  paid_by_driver BOOLEAN DEFAULT false,
  broker_amount NUMERIC(10,2),
  company_amount NUMERIC(10,2),
  driver_amount NUMERIC(10,2),
  driver_payment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lumper_services ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lumper_services table (inherit from loads)
CREATE POLICY "Lumper services access follows load access" ON public.lumper_services
  FOR ALL USING (
    load_id IN (
      SELECT id FROM public.loads
    )
  );

-- ========================================
-- 8. Create Pay Statements Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.pay_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_pay NUMERIC(10,2) NOT NULL DEFAULT 0,
  additions JSONB DEFAULT '{}',
  deductions JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pay_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pay_statements table
CREATE POLICY "Drivers can read their own pay statements" ON public.pay_statements
  FOR SELECT USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all pay statements" ON public.pay_statements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage pay statements" ON public.pay_statements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 9. Create Load Documents Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.load_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID REFERENCES public.loads(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT CHECK (processing_status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  original_size INTEGER,
  compressed_size INTEGER,
  compression_ratio NUMERIC(5,2)
);

ALTER TABLE public.load_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for load_documents table (inherit from loads)
CREATE POLICY "Load documents access follows load access" ON public.load_documents
  FOR ALL USING (
    load_id IN (
      SELECT id FROM public.loads
    )
  );

-- ========================================
-- 10. Create Recent Activities Table
-- ========================================

CREATE TABLE IF NOT EXISTS public.recent_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recent_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read activities" ON public.recent_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage activities" ON public.recent_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- 11. Create Database Functions
-- ========================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add status update activity
CREATE OR REPLACE FUNCTION public.add_status_update_activity(
  p_driver_name TEXT,
  p_load_reference_id TEXT,
  p_new_status TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recent_activities (activity_text)
  VALUES (
    CASE p_new_status
      WHEN 'In-Transit' THEN p_driver_name || ' started load ' || p_load_reference_id
      WHEN 'Delivered' THEN p_driver_name || ' completed load ' || p_load_reference_id
      ELSE p_driver_name || ' updated load ' || p_load_reference_id || ' to ' || p_new_status
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add document upload activity
CREATE OR REPLACE FUNCTION public.add_document_upload_activity(
  p_driver_name TEXT,
  p_load_reference_id TEXT,
  p_file_name TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recent_activities (activity_text)
  VALUES (p_driver_name || ' uploaded document ' || p_file_name || ' for load ' || p_load_reference_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 12. Create Triggers
-- ========================================

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for lumper_services
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lumper_services_updated_at ON public.lumper_services;
CREATE TRIGGER update_lumper_services_updated_at
  BEFORE UPDATE ON public.lumper_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 13. Create Storage Bucket (if not exists)
-- ========================================

-- Note: This needs to be run separately in the Supabase dashboard or via the API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('load-pdfs', 'load-pdfs', false)
-- ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 14. Set Initial Admin Users
-- ========================================

-- 6. Update specific emails to admin role (REPLACE WITH YOUR ADMIN EMAILS)
UPDATE public.users
SET role = 'admin'
WHERE email IN ('your-admin-email@example.com', 'another-admin@example.com');

-- ========================================
-- 15. Grant Necessary Permissions
-- ========================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========================================
-- Migration Complete
-- ========================================

-- This migration creates:
-- ✅ All required tables with proper relationships
-- ✅ Row Level Security policies for data access control
-- ✅ Database triggers for user creation and updates
-- ✅ Functions for activity logging
-- ✅ Proper CASCADE DELETE relationships
-- ✅ Check constraints for data validation

-- Next Steps:
-- 1. Update the admin email addresses in section 14
-- 2. Create the 'load-pdfs' storage bucket in Supabase dashboard
-- 3. Configure Supabase Auth settings (disable public signup)
-- 4. Test the application with admin and driver accounts