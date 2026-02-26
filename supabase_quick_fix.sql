-- =============================================
-- QUICK FIX - Run this in Supabase SQL Editor
-- This fixes the login issue for existing users
-- =============================================

-- 1. Create the auto-profile trigger function
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

-- 2. Enable the trigger for future signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Add missing RLS INSERT/UPDATE policies
DO $$
BEGIN
    -- Users table
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all users' AND tablename = 'users') THEN
        CREATE POLICY "Admins can update all users" ON public.users FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Wallets table
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own wallet' AND tablename = 'wallets') THEN
        CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own wallet' AND tablename = 'wallets') THEN
        CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- Transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own transactions' AND tablename = 'transactions') THEN
        CREATE POLICY "Users can create own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Unlocks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own unlocks' AND tablename = 'unlocks') THEN
        CREATE POLICY "Users can create own unlocks" ON public.unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Inspections
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own inspections' AND tablename = 'inspections') THEN
        CREATE POLICY "Users can create own inspections" ON public.inspections FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agents can update assigned inspections' AND tablename = 'inspections') THEN
        CREATE POLICY "Agents can update assigned inspections" ON public.inspections FOR UPDATE USING (auth.uid() = agent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all inspections' AND tablename = 'inspections') THEN
        CREATE POLICY "Admins can update all inspections" ON public.inspections FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Inspection transactions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own inspection transactions' AND tablename = 'inspection_transactions') THEN
        CREATE POLICY "Users can view own inspection transactions" ON public.inspection_transactions FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own inspection transactions' AND tablename = 'inspection_transactions') THEN
        CREATE POLICY "Users can create own inspection transactions" ON public.inspection_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Agent verification
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create verification requests' AND tablename = 'agent_verification_requests') THEN
        CREATE POLICY "Users can create verification requests" ON public.agent_verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update verification requests' AND tablename = 'agent_verification_requests') THEN
        CREATE POLICY "Admins can update verification requests" ON public.agent_verification_requests FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;

    -- Properties
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Agents can update own properties' AND tablename = 'properties') THEN
        CREATE POLICY "Agents can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = uploaded_by_agent_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all properties' AND tablename = 'properties') THEN
        CREATE POLICY "Admins can update all properties" ON public.properties FOR UPDATE USING (
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;

-- 4. Fix existing users who signed up before trigger was enabled
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
SELECT au.id, 0
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.wallets w WHERE w.user_id = au.id);
