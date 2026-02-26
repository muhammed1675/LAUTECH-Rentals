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
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No profile row — try creating one
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
          // Trigger may have created it — retry read
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
      console.error('loadUserProfile exception:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        const profile = await loadUserProfile(s.user);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s?.user) {
        const profile = await loadUserProfile(s.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await loadUserProfile(data.user);
    if (!profile) {
      throw new Error('Could not load your profile. Please run the database setup SQL in Supabase.');
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

    // Wait for trigger to create profile
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
      setUser(profile);
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
