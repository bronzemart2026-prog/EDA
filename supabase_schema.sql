-- =========================================================================
-- EDA (Entrepreneur Development Association) - Complete Supabase Setup
-- Includes: Tables, Schema, Security Policies (RLS), Permissions (GRANTs),
-- Helper Triggers, and Clean Admin Account Seed
-- Phone / Username: 01825334505 | Password: 01906872
-- =========================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 2. CREATE APPLICATION TABLES
-- =========================================================================

-- Profiles (Admins & Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    member_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    nid TEXT,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    monthly_deposit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    photo_url TEXT,
    nid_front_url TEXT,
    nid_back_url TEXT,
    nominee_name TEXT,
    nominee_mobile TEXT,
    nominee_nid_front_url TEXT,
    nominee_nid_back_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Projects (Investments)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    project_type TEXT DEFAULT 'অন্যান্য',
    driver_name TEXT,
    driver_mobile TEXT,
    driver_address TEXT,
    driver_nid TEXT,
    nominee_name TEXT,
    nominee_mobile TEXT,
    investment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    interest_percentage NUMERIC(5, 2),
    return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    installment_duration INTEGER NOT NULL DEFAULT 12,
    monthly_installment_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'defaulted')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Deposits (Savings)
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Installments (Project Collections)
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL DEFAULT 'সাধারণ',
    description TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =========================================================================
-- 3. SCHEMA PRIVILEGES & GRANTS (Fixes 401 Permission Denied)
-- =========================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;
CREATE POLICY "Allow all for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read for anon" ON public.profiles;
CREATE POLICY "Allow read for anon" ON public.profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.members;
CREATE POLICY "Allow all for authenticated users" ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.projects;
CREATE POLICY "Allow all for authenticated users" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.deposits;
CREATE POLICY "Allow all for authenticated users" ON public.deposits FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.installments;
CREATE POLICY "Allow all for authenticated users" ON public.installments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.expenses;
CREATE POLICY "Allow all for authenticated users" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- 5. STORAGE BUCKET FOR DOCUMENTS & PHOTOS
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads in member-documents" ON storage.objects;
CREATE POLICY "Allow public uploads in member-documents" ON storage.objects
FOR ALL TO authenticated, anon USING (bucket_id = 'member-documents') WITH CHECK (bucket_id = 'member-documents');

-- =========================================================================
-- 6. RPC HELPER FUNCTIONS
-- =========================================================================

-- Resolve login email by mobile number, username, or email
CREATE OR REPLACE FUNCTION public.get_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT u.email INTO v_email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(TRIM(p_identifier))
       OR p.mobile = TRIM(p_identifier)
       OR LOWER(u.email) = LOWER(TRIM(p_identifier))
    LIMIT 1;

    -- Fallback to default format if not found in profiles
    IF v_email IS NULL THEN
        v_email := LOWER(TRIM(p_identifier)) || '@somiti.com';
    END IF;

    RETURN v_email;
END;
$$;

-- Auto-confirm emails trigger
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user();

-- Automatically sync created auth users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, mobile, username, role, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Md Arif Uddin'),
        COALESCE(NEW.raw_user_meta_data->>'mobile', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        status = 'active';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 7. CLEAN & SEED ADMIN ACCOUNT
-- Mobile:   01825334505
-- Password: 01906872
-- =========================================================================

-- First remove any broken/incomplete entry for this user
DELETE FROM auth.users WHERE email = '01825334505@somiti.com';

DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_identity_id UUID := gen_random_uuid();
    v_phone TEXT := '01825334505';
    v_email TEXT := '01825334505@somiti.com';
    v_pass TEXT := '01906872';
    v_name TEXT := 'Md Arif Uddin';
BEGIN
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        is_super_admin,
        phone,
        phone_confirmed_at,
        phone_change,
        phone_change_token,
        email_change_token_current,
        email_change_confirm_status,
        banned_until,
        reauthentication_token,
        reauthentication_sent_at,
        is_sso_user,
        deleted_at,
        is_anonymous
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(v_pass, gen_salt('bf')),
        now(),
        NULL,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('name', v_name, 'role', 'admin', 'sub', v_user_id::text, 'email', v_email, 'mobile', v_phone, 'username', v_phone),
        now(),
        now(),
        '',
        '',
        '',
        '',
        FALSE,
        '',
        NULL,
        '',
        '',
        '',
        0,
        NULL,
        '',
        NULL,
        FALSE,
        NULL,
        FALSE
    );

    INSERT INTO auth.identities (
        identity_id,
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_identity_id,
        v_user_id::text,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        now(),
        now(),
        now()
    );

    INSERT INTO public.profiles (
        id, name, mobile, username, role, status
    ) VALUES (
        v_user_id, v_name, v_phone, v_phone, 'admin', 'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        mobile = EXCLUDED.mobile,
        username = EXCLUDED.username,
        role = 'admin',
        status = 'active';

    RAISE NOTICE 'Admin user created successfully with ID: %', v_user_id;
END $$;
