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
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
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
    profession TEXT,
    designation TEXT,
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

-- Auto-generate sequential 3-digit member_id (e.g., '001', '002') if not provided
CREATE OR REPLACE FUNCTION public.generate_member_id()
RETURNS TRIGGER AS $$
DECLARE
    v_next_val INT;
BEGIN
    IF NEW.member_id IS NULL OR TRIM(NEW.member_id) = '' THEN
        SELECT COALESCE(MAX(NULLIF(regexp_replace(member_id, '\D', '', 'g'), '')::INT), 0) + 1 
        INTO v_next_val 
        FROM public.members;
        
        NEW.member_id := LPAD(v_next_val::TEXT, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_member_id ON public.members;
CREATE TRIGGER trigger_generate_member_id
BEFORE INSERT ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.generate_member_id();

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
        COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
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
-- ADMIN USER MANAGEMENT RPC FUNCTIONS
-- =========================================================================

-- 1. Create User
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
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_email TEXT;
    v_encrypted_pw TEXT;
    v_existing_profile UUID;
BEGIN
    -- Check if username already exists in profiles
    SELECT id INTO v_existing_profile
    FROM public.profiles
    WHERE LOWER(username) = LOWER(TRIM(p_username))
    LIMIT 1;

    IF v_existing_profile IS NOT NULL THEN
        RAISE EXCEPTION 'ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে';
    END IF;

    -- Format email
    IF TRIM(p_username) LIKE '%@%' THEN
        v_email := LOWER(TRIM(p_username));
    ELSE
        v_email := LOWER(TRIM(p_username)) || '@somiti.com';
    END IF;

    -- Check if auth user already exists with this email
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE EXCEPTION 'এই ইউজারনেম বা ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি আছে';
    END IF;

    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- 1. Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
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
        v_encrypted_pw,
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object(
            'name', TRIM(p_name),
            'mobile', TRIM(p_mobile),
            'username', LOWER(TRIM(p_username)),
            'role', COALESCE(p_role, 'member'),
            'sub', v_user_id::text,
            'email', v_email
        ),
        now(),
        now(),
        '', -- confirmation_token (GoTrue requires empty string instead of NULL)
        '', -- email_change
        '', -- email_change_token_new
        '', -- recovery_token
        FALSE,
        NULL,
        NULL,
        '', -- phone_change
        '', -- phone_change_token
        '', -- email_change_token_current
        0,
        NULL,
        '', -- reauthentication_token
        NULL,
        FALSE,
        NULL,
        FALSE
    );

    -- 2. Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        v_user_id::text,
        now(),
        now(),
        now()
    );

    -- 3. Upsert public.profiles
    INSERT INTO public.profiles (
        id,
        name,
        mobile,
        username,
        role,
        status,
        member_id,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        TRIM(p_name),
        TRIM(p_mobile),
        LOWER(TRIM(p_username)),
        COALESCE(p_role, 'member'),
        COALESCE(p_status, 'active'),
        p_member_id,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        mobile = EXCLUDED.mobile,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        member_id = EXCLUDED.member_id,
        updated_at = now();

    RETURN jsonb_build_object(
        'id', v_user_id,
        'name', TRIM(p_name),
        'mobile', TRIM(p_mobile),
        'username', LOWER(TRIM(p_username)),
        'role', COALESCE(p_role, 'member'),
        'status', COALESCE(p_status, 'active'),
        'memberId', p_member_id
    );
END;
$$;

-- 2. Update User
CREATE OR REPLACE FUNCTION public.admin_update_user(
    p_user_id UUID,
    p_name TEXT DEFAULT NULL,
    p_mobile TEXT DEFAULT NULL,
    p_username TEXT DEFAULT NULL,
    p_password TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'member',
    p_status TEXT DEFAULT 'active',
    p_member_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Check if username belongs to another user
    IF p_username IS NOT NULL AND p_username <> '' THEN
        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE LOWER(username) = LOWER(TRIM(p_username)) 
              AND id <> p_user_id
        ) THEN
            RAISE EXCEPTION 'ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে';
        END IF;

        IF TRIM(p_username) LIKE '%@%' THEN
            v_email := LOWER(TRIM(p_username));
        ELSE
            v_email := LOWER(TRIM(p_username)) || '@somiti.com';
        END IF;
    END IF;

    -- Update auth.users if password or email changed
    UPDATE auth.users
    SET
        encrypted_password = CASE 
            WHEN p_password IS NOT NULL AND p_password <> '' 
            THEN crypt(p_password, gen_salt('bf')) 
            ELSE encrypted_password 
        END,
        email = CASE 
            WHEN v_email IS NOT NULL 
            THEN v_email 
            ELSE email 
        END,
        raw_user_meta_data = raw_user_meta_data || jsonb_strip_nulls(jsonb_build_object(
            'name', p_name,
            'mobile', p_mobile,
            'username', p_username,
            'role', p_role
        )),
        updated_at = now()
    WHERE id = p_user_id;

    -- Update auth.identities email if changed
    IF v_email IS NOT NULL THEN
        UPDATE auth.identities
        SET 
            identity_data = jsonb_set(identity_data, '{email}', to_jsonb(v_email)),
            updated_at = now()
        WHERE user_id = p_user_id AND provider = 'email';
    END IF;

    -- Update public.profiles
    UPDATE public.profiles
    SET
        name = COALESCE(TRIM(p_name), name),
        mobile = COALESCE(TRIM(p_mobile), mobile),
        username = COALESCE(LOWER(TRIM(p_username)), username),
        role = COALESCE(p_role, role),
        status = COALESCE(p_status, status),
        member_id = p_member_id,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'id', p_user_id,
        'message', 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে'
    );
END;
$$;

-- 3. Delete User
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
    DELETE FROM public.profiles WHERE id = p_user_id;
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.admin_create_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated, anon;

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
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        0,
        NULL,
        NULL,
        NULL,
        FALSE,
        NULL,
        FALSE
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_user_id,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        'email',
        v_user_id::text,
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

-- =========================================================================
-- 7. REPAIR SCRIPT FOR PREVIOUSLY CREATED ACCOUNTS
-- Run this in the Supabase Dashboard SQL Editor if existing accounts give
-- "Database error querying schema" (500) during login.
-- =========================================================================

UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    recovery_token = COALESCE(recovery_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR email_change IS NULL
   OR recovery_token IS NULL;

-- If needed for identities:
UPDATE auth.identities
SET provider_id = user_id::text
WHERE provider = 'email' AND (provider_id IS NULL OR provider_id = '');
