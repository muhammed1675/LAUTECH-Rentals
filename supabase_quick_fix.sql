-- =============================================
-- LAUTECH Rentals - RLS FIX
-- Run this in Supabase SQL Editor to fix login
-- =============================================

-- 1. Create a SECURITY DEFINER function to check admin role
-- This bypasses RLS and prevents infinite recursion
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

-- 2. Drop ALL existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
DROP POLICY IF EXISTS "Service role can manage wallets" ON public.wallets;

DROP POLICY IF EXISTS "Anyone can view approved properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can create properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update all properties" ON public.properties;
DROP POLICY IF EXISTS "Service role can manage properties" ON public.properties;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.transactions;

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.unlocks;
DROP POLICY IF EXISTS "Users can create own unlocks" ON public.unlocks;
DROP POLICY IF EXISTS "Service role can manage unlocks" ON public.unlocks;

DROP POLICY IF EXISTS "Users can view own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can create own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Agents can view assigned inspections" ON public.inspections;
DROP POLICY IF EXISTS "Agents can update assigned inspections" ON public.inspections;
DROP POLICY IF EXISTS "Admins can view all inspections" ON public.inspections;
DROP POLICY IF EXISTS "Admins can update all inspections" ON public.inspections;
DROP POLICY IF EXISTS "Service role can manage inspections" ON public.inspections;

DROP POLICY IF EXISTS "Users can view own inspection transactions" ON public.inspection_transactions;
DROP POLICY IF EXISTS "Users can create own inspection transactions" ON public.inspection_transactions;

DROP POLICY IF EXISTS "Users can view own verification requests" ON public.agent_verification_requests;
DROP POLICY IF EXISTS "Users can create verification requests" ON public.agent_verification_requests;
DROP POLICY IF EXISTS "Admins can view all verification requests" ON public.agent_verification_requests;
DROP POLICY IF EXISTS "Admins can update verification requests" ON public.agent_verification_requests;
DROP POLICY IF EXISTS "Service role can manage verification requests" ON public.agent_verification_requests;

-- 3. Recreate ALL policies using the safe helper functions

-- Users (NO recursion - uses is_admin() function)
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_select_admin" ON public.users
    FOR SELECT USING (public.is_admin());
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_update_admin" ON public.users
    FOR UPDATE USING (public.is_admin());

-- Wallets
CREATE POLICY "wallets_select_own" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_select_admin" ON public.wallets
    FOR SELECT USING (public.is_admin());
CREATE POLICY "wallets_insert_own" ON public.wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update_own" ON public.wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Properties
CREATE POLICY "properties_select_approved" ON public.properties
    FOR SELECT USING (status = 'approved');
CREATE POLICY "properties_select_own_agent" ON public.properties
    FOR SELECT USING (auth.uid() = uploaded_by_agent_id);
CREATE POLICY "properties_select_admin" ON public.properties
    FOR SELECT USING (public.is_admin());
CREATE POLICY "properties_insert_agent" ON public.properties
    FOR INSERT WITH CHECK (public.is_agent_or_admin());
CREATE POLICY "properties_update_own_agent" ON public.properties
    FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);
CREATE POLICY "properties_update_admin" ON public.properties
    FOR UPDATE USING (public.is_admin());

-- Transactions
CREATE POLICY "transactions_select_own" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_select_admin" ON public.transactions
    FOR SELECT USING (public.is_admin());
CREATE POLICY "transactions_insert_own" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Unlocks
CREATE POLICY "unlocks_select_own" ON public.unlocks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "unlocks_insert_own" ON public.unlocks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Inspections
CREATE POLICY "inspections_select_own" ON public.inspections
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inspections_select_agent" ON public.inspections
    FOR SELECT USING (auth.uid() = agent_id);
CREATE POLICY "inspections_select_admin" ON public.inspections
    FOR SELECT USING (public.is_admin());
CREATE POLICY "inspections_insert_own" ON public.inspections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inspections_update_agent" ON public.inspections
    FOR UPDATE USING (auth.uid() = agent_id);
CREATE POLICY "inspections_update_admin" ON public.inspections
    FOR UPDATE USING (public.is_admin());

-- Inspection transactions
CREATE POLICY "insp_tx_select_own" ON public.inspection_transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insp_tx_insert_own" ON public.inspection_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agent verification requests
CREATE POLICY "verification_select_own" ON public.agent_verification_requests
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "verification_select_admin" ON public.agent_verification_requests
    FOR SELECT USING (public.is_admin());
CREATE POLICY "verification_insert_own" ON public.agent_verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "verification_update_admin" ON public.agent_verification_requests
    FOR UPDATE USING (public.is_admin());

-- 4. Make sure the trigger exists
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix existing users missing profiles
INSERT INTO public.users (id, email, full_name, role, suspended)
SELECT au.id, au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
    'user', false
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id);

INSERT INTO public.wallets (user_id, token_balance)
SELECT au.id, 0
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = au.id);
