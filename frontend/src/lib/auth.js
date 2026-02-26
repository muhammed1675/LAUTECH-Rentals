import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return null;
    try {
      const { data, error } = await supabase
        .from('users').select('*').eq('id', authUser.id).single();

      if (error && error.code === 'PGRST116') {
        const { data: created } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            role: 'user',
            suspended: false
          })
          .select().single();
        await supabase.from('wallets').insert({ user_id: authUser.id, token_balance: 0 });
        return created ? { ...created, token_balance: 0 } : null;
      }

      if (error) return null;

      const { data: wallet } = await supabase
        .from('wallets').select('token_balance').eq('user_id', authUser.id).single();

      return { ...data, token_balance: wallet?.token_balance || 0 };
    } catch {
      return null;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) { setUser(null); setLoading(false); }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [loadUserProfile]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes('email not confirmed'))
          throw new Error('Please confirm your email first. Check your inbox.');
        throw error;
      }
      const profile = await loadUserProfile(data.user);
      if (!profile) throw new Error('Could not load profile. Please try again.');
      setUser(profile);
      setSession(data.session);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    if (!data.session) return { requiresConfirmation: true };
    await new Promise(r => setTimeout(r, 1000));
    const profile = await loadUserProfile(data.user);
    setUser(profile);
    setSession(data.session);
    return profile;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user) {
      const profile = await loadUserProfile(s.user);
      if (profile) setUser(profile);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading,
      login, register, logout, refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isAgent: user?.role === 'agent',
      isUser: user?.role === 'user',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
