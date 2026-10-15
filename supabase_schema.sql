-- =========================================================================
-- EDA (Entrepreneur Development Association) - Complete Supabase Setup
-- Includes: Tables, Schema, Security Policies (RLS), Storage, Helper Functions
-- and Admin Account Seed (Mobile: 01825334505 / Password: 01906872)
-- =========================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- 2. CREATE TABLES
-- =========================================================================

-- PROFILES (Users & Admins)
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

-- MEMBERS (Samity Members)
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

-- PROJECTS (Investments / Auto-Rickshaw / Business Projects)
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

-- DEPOSITS (Monthly Savings Collections)
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INSTALLMENTS (Project Collections)
CREATE TABLE IF NOT EXISTS public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    month TEXT NOT NULL,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- EXPENSES (Operational Expenses)
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated users
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.profiles;
CREATE POLICY "Allow all for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

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

-- Allow public read on profiles for initial login lookup
DROP POLICY IF EXISTS "Allow read for anon" ON public.profiles;
CREATE POLICY "Allow read for anon" ON public.profiles FOR SELECT TO anon USING (true);

-- =========================================================================
-- 4. STORAGE BUCKET FOR DOCUMENTS & PHOTOS
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-documents', 'member-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public uploads in member-documents" ON storage.objects;
CREATE POLICY "Allow public uploads in member-documents" ON storage.objects
FOR ALL TO authenticated, anon USING (bucket_id = 'member-documents') WITH CHECK (bucket_id = 'member-documents');

-- =========================================================================
-- 5. RPC HELPER FUNCTIONS (Login resolution & Admin operations)
-- =========================================================================

-- Resolve login email by mobile number or username
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
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(TRIM(p_identifier))
       OR p.mobile = TRIM(p_identifier)
       OR LOWER(u.email) = LOWER(TRIM(p_identifier))
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- Admin Create User RPC
CREATE OR REPLACE FUNCTION public.admin_create_user(
    p_name TEXT,
    p_mobile TEXT,
    p_username TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'member',
    p_status TEXT DEFAULT 'active',
    p_member_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_email TEXT := LOWER(TRIM(p_username)) || '@somiti.com';
BEGIN
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
    )
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', p_name, 'role', p_role),
        now(),
        now()
    );

    INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
    );

    INSERT INTO public.profiles (
        id, name, mobile, username, role, status, member_id
    )
    VALUES (
        v_user_id, p_name, p_mobile, LOWER(TRIM(p_username)), p_role, p_status, p_member_id
    );

    RETURN jsonb_build_object('id', v_user_id, 'username', p_username, 'mobile', p_mobile);
END;
$$;

-- =========================================================================
-- 6. SEED ADMIN ACCOUNT
-- Phone / Username: 01825334505
-- Password:         01906872
-- Role:             admin
-- Status:           active
-- =========================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_phone TEXT := '01825334505';
    v_email TEXT := '01825334505@somiti.com';
    v_pass TEXT := '01906872';
    v_name TEXT := 'Md Arif Uddin';
BEGIN
    -- Check if user already exists in auth.users by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- User exists: update password to 01906872 and confirm email
        UPDATE auth.users
        SET encrypted_password = crypt(v_pass, gen_salt('bf')),
            email_confirmed_at = now(),
            updated_at = now()
        WHERE id = v_user_id;

        -- Ensure profile is admin and active
        INSERT INTO public.profiles (id, name, mobile, username, role, status)
        VALUES (v_user_id, v_name, v_phone, v_phone, 'admin', 'active')
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            username = EXCLUDED.username,
            role = 'admin',
            status = 'active';

        RAISE NOTICE 'Admin user (%) password updated successfully.', v_phone;
    ELSE
        -- User does not exist: create fresh
        v_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password,
            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            v_email,
            crypt(v_pass, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('name', v_name, 'role', 'admin'),
            now(),
            now()
        );

        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        )
        VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            v_user_id::text,
            now(),
            now(),
            now()
        );

        INSERT INTO public.profiles (id, name, mobile, username, role, status)
        VALUES (v_user_id, v_name, v_phone, v_phone, 'admin', 'active');

        RAISE NOTICE 'Admin user (%) created successfully with ID: %', v_phone, v_user_id;
    END IF;
END $$;
