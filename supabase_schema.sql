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
-- HELPER FUNCTIONS (prevent RLS recursion)
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_agent_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('agent', 'admin')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- AUTO-CREATE PROFILE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role, suspended)
    VALUES (
        NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'user', false
    );
    INSERT INTO public.wallets (user_id, token_balance) VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_transactions ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON public.users FOR SELECT USING (public.is_admin());
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_update_admin" ON public.users FOR UPDATE USING (public.is_admin());

-- Wallets
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_select_admin" ON public.wallets FOR SELECT USING (public.is_admin());
CREATE POLICY "wallets_insert_own" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update_own" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Properties
CREATE POLICY "properties_select_approved" ON public.properties FOR SELECT USING (status = 'approved');
CREATE POLICY "properties_select_own_agent" ON public.properties FOR SELECT USING (auth.uid() = uploaded_by_agent_id);
CREATE POLICY "properties_select_admin" ON public.properties FOR SELECT USING (public.is_admin());
CREATE POLICY "properties_insert_agent" ON public.properties FOR INSERT WITH CHECK (public.is_agent_or_admin());
CREATE POLICY "properties_update_own_agent" ON public.properties FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);
CREATE POLICY "properties_update_admin" ON public.properties FOR UPDATE USING (public.is_admin());

-- Transactions
CREATE POLICY "transactions_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_select_admin" ON public.transactions FOR SELECT USING (public.is_admin());
CREATE POLICY "transactions_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Unlocks
CREATE POLICY "unlocks_select_own" ON public.unlocks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "unlocks_insert_own" ON public.unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Inspections
CREATE POLICY "inspections_select_own" ON public.inspections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inspections_select_agent" ON public.inspections FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "inspections_select_admin" ON public.inspections FOR SELECT USING (public.is_admin());
CREATE POLICY "inspections_insert_own" ON public.inspections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspections_update_agent" ON public.inspections FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "inspections_update_admin" ON public.inspections FOR UPDATE USING (public.is_admin());

-- Inspection transactions
CREATE POLICY "insp_tx_select_own" ON public.inspection_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insp_tx_insert_own" ON public.inspection_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agent verification
CREATE POLICY "verification_select_own" ON public.agent_verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verification_select_admin" ON public.agent_verification_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "verification_insert_own" ON public.agent_verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verification_update_admin" ON public.agent_verification_requests FOR UPDATE USING (public.is_admin());

-- ============================================
-- ADMIN SETUP: After registering, run:
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ============================================
