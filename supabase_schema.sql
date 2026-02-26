-- =============================================
-- LAUTECH Rentals - Supabase Database Schema
-- Run this ENTIRE file in Supabase SQL Editor
-- =============================================

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin')),
    suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    id_card_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by_admin_id UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    location TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('hostel', 'apartment')),
    images TEXT[] DEFAULT '{}',
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    uploaded_by_agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    uploaded_by_agent_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by_admin_id UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    tokens_added INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    koralpay_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    property_title TEXT NOT NULL,
    agent_id UUID REFERENCES public.users(id),
    agent_name TEXT,
    inspection_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
    payment_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inspection_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL DEFAULT 2000,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    koralpay_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_user_id ON public.agent_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON public.agent_verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_agent ON public.properties(uploaded_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_unlocks_user ON public.unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_agent ON public.inspections(agent_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON public.inspections(status);

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER (CRITICAL)
-- This automatically creates a public.users row
-- and wallet when someone signs up via Supabase Auth
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, suspended)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user',
        false
    );

    INSERT INTO public.wallets (user_id, token_balance)
    VALUES (NEW.id, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_transactions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Properties policies
CREATE POLICY "Anyone can view approved properties" ON public.properties
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Agents can view own properties" ON public.properties
    FOR SELECT USING (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Admins can view all properties" ON public.properties
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Agents can create properties" ON public.properties
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('agent', 'admin'))
    );

CREATE POLICY "Agents can update own properties" ON public.properties
    FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);

CREATE POLICY "Admins can update all properties" ON public.properties
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Unlocks policies
CREATE POLICY "Users can view own unlocks" ON public.unlocks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own unlocks" ON public.unlocks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Inspections policies
CREATE POLICY "Users can view own inspections" ON public.inspections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inspections" ON public.inspections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can view assigned inspections" ON public.inspections
    FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can update assigned inspections" ON public.inspections
    FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view all inspections" ON public.inspections
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all inspections" ON public.inspections
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Inspection transactions policies
CREATE POLICY "Users can view own inspection transactions" ON public.inspection_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inspection transactions" ON public.inspection_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agent verification policies
CREATE POLICY "Users can view own verification requests" ON public.agent_verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests" ON public.agent_verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests" ON public.agent_verification_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update verification requests" ON public.agent_verification_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FIX EXISTING USERS (run after enabling trigger)
-- Creates profiles for users who signed up
-- before the trigger was enabled
-- ============================================

INSERT INTO public.users (id, email, full_name, role, suspended)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'user',
    false
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

INSERT INTO public.wallets (user_id, token_balance)
SELECT
    au.id,
    0
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = au.id);

-- ============================================
-- INITIAL ADMIN SETUP
-- After registering your admin account, run:
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ============================================
