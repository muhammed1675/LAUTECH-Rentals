import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

// ── Clean error message helper ──────────────────────────────────
const parseAuthError = (error) => {
  if (!error) return 'Something went wrong. Please try again.';
  
  const msg = (error.message || error.toString()).toLowerCase();

  // Body stream / fetch / network errors — the main bug being fixed
  if (msg.includes('body stream') || msg.includes('json') || msg.includes('already read'))
    return 'Wrong email or password. Please try again.';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch'))
    return 'Network error. Please check your connection and try again.';

  // Auth errors
  if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
    return 'Wrong email or password. Please try again.';
  if (msg.includes('user not found') || msg.includes('no user found'))
    return 'No account found with this email. Please register first.';
  if (msg.includes('email not confirmed'))
    return 'Please confirm your email first. Check your inbox.';
  if (msg.includes('email already') || msg.includes('already registered'))
    return 'An account with this email already exists. Please login instead.';
  if (msg.includes('password') && msg.includes('short'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('too many requests') || msg.includes('rate limit'))
    return 'Too many attempts. Please wait a moment and try again.';
  if (msg.includes('signup is disabled'))
    return 'New registrations are currently disabled. Contact support.';

  // Return the original message if it's clean enough, else generic
  if (error.message && error.message.length < 100 && !error.message.includes('fetch'))
    return error.message;

  return 'Something went wrong. Please try again.';
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (authUser, retries = 3) => {
    if (!authUser?.id) return null;

    for (let i = 0; i < retries; i++) {
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1000 * i));

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // No profile row — create it
          const { data: created } = await supabase
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

          await supabase.from('wallets').insert({ user_id: authUser.id, token_balance: 0 });
          return created ? { ...created, token_balance: 0 } : null;
        }

        if (error) {
          console.warn(`Profile load attempt ${i + 1} failed:`, error.message);
          continue;
        }

        const { data: wallet } = await supabase
          .from('wallets')
          .select('token_balance')
          .eq('user_id', authUser.id)
          .single();

        return { ...data, token_balance: wallet?.token_balance || 0 };

      } catch (err) {
        console.warn(`Profile load attempt ${i + 1} exception:`, err.message);
      }
    }

    return null;
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

  // ── Login ────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      let data, error;

      try {
        const result = await supabase.auth.signInWithPassword({ email, password });
        data = result.data;
        error = result.error;
      } catch (fetchErr) {
        // Wrap raw fetch/stream errors
        throw new Error(parseAuthError(fetchErr));
      }

      if (error) {
        throw new Error(parseAuthError(error));
      }

      await new Promise(r => setTimeout(r, 800));

      const profile = await loadUserProfile(data.user);

      if (!profile) {
        // Fallback: try email lookup
        const { data: found } = await supabase
          .from('users')
          .select('*')
          .eq('email', data.user.email)
          .single();

        if (found) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('token_balance')
            .eq('user_id', found.id)
            .single();
          const fullProfile = { ...found, token_balance: wallet?.token_balance || 0 };
          setUser(fullProfile);
          setSession(data.session);
          return fullProfile;
        }

        throw new Error('Could not load your profile. Please try again in a moment.');
      }

      setUser(profile);
      setSession(data.session);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  // ── Register ─────────────────────────────────────────────────
  const register = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      });

      if (error) throw new Error(parseAuthError(error));
      if (!data.session) return { requiresConfirmation: true };

      await new Promise(r => setTimeout(r, 1000));
      const profile = await loadUserProfile(data.user);
      setUser(profile);
      setSession(data.session);
      return profile;
    } catch (err) {
      // Re-throw with clean message if not already cleaned
      if (err.message && err.message.length < 120) throw err;
      throw new Error(parseAuthError(err));
    }
  };

  // ── Logout ───────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // ── Refresh user ─────────────────────────────────────────────
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
