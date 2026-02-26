import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileLoadingRef = useRef(false);

  const loadUserProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return null;
    if (profileLoadingRef.current) return null;
    profileLoadingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: created, error: insertErr } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            role: 'user',
            suspended: false
          })
          .select()
          .single();

        if (insertErr) {
          const { data: retry } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (retry) {
            const { data: w } = await supabase.from('wallets').select('token_balance').eq('user_id', authUser.id).single();
            return { ...retry, token_balance: w?.token_balance || 0 };
          }
          return null;
        }

        await supabase.from('wallets').insert({ user_id: authUser.id, token_balance: 0 });
        return { ...created, token_balance: 0 };
      }

      if (error) {
        if (error.name === 'AbortError' || error.message?.includes('AbortError') || error.message?.includes('Lock broken')) {
          return null;
        }
        console.error('Profile load error:', error.message);
        return null;
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('token_balance')
        .eq('user_id', authUser.id)
        .single();

      return { ...data, token_balance: wallet?.token_balance || 0 };
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('AbortError') || err.message?.includes('Lock broken')) {
        return null;
      }
      console.error('loadUserProfile exception:', err);
      return null;
    } finally {
      profileLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const profile = await loadUserProfile(s.user);
        if (mounted && profile) setUser(profile);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const profile = await loadUserProfile(s.user);
        if (mounted && profile) setUser(profile);
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        throw new Error('Please confirm your email first. Check your inbox for a confirmation link.');
      }
      throw error;
    }

    await new Promise(r => setTimeout(r, 500));
    const profile = await loadUserProfile(data.user);
    if (!profile) {
      throw new Error('Could not load your profile. Please contact support.');
    }
    setUser(profile);
    return profile;
  };

  const register = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });

    if (error) throw error;

    if (!data.session) {
      return { requiresConfirmation: true };
    }

    await new Promise(r => setTimeout(r, 1500));
    const profile = await loadUserProfile(data.user);
    setUser(profile);
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    if (session?.user) {
      const profile = await loadUserProfile(session.user);
      if (profile) setUser(profile);
    }
  };

  const value = {
    user, session, loading,
    login, register, logout, refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAgent: user?.role === 'agent',
    isUser: user?.role === 'user',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
