import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase env vars missing! Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set.'
  );
}

let supabaseInstance = null;

function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }
  );

  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export default supabase;
