import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUser) => {
    try {
      // Try to load existing profile
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet (trigger may not have fired)
        // Create it from auth user data
        const { data: newProfile, error: insertError } = await supabase
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

        if (insertError) {
          console.error('Profile creation failed:', insertError);
          // One more attempt to read (trigger might have created it between our read and write)
          const { data: retryData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          if (retryData) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('token_balance')
              .eq('user_id', authUser.id)
              .single();
            return { ...retryData, token_balance: wallet?.token_balance || 0 };
          }
          return null;
        }

        // Also create wallet if profile was created
        await supabase
          .from('wallets')
          .insert({ user_id: authUser.id, token_balance: 0 });

        return { ...newProfile, token_balance: 0 };
      }

      if (error) throw error;

      // Get wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('token_balance')
        .eq('user_id', authUser.id)
        .single();

      return {
        ...data,
        token_balance: wallet?.token_balance || 0
      };
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await loadUserProfile(session.user);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await loadUserProfile(session.user);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserProfile]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const profile = await loadUserProfile(data.user);
    setUser(profile);
    return profile;
  };

  const register = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) throw error;

    // Wait briefly for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Load profile (trigger should have created it, loadUserProfile handles fallback)
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
    user,
    session,
    loading,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAgent: user?.role === 'agent',
    isUser: user?.role === 'user',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
