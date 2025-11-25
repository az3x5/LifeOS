import { createClient } from '@supabase/supabase-js';

// The Supabase client is initialized with the project's URL and anon key from environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase credentials are missing. Please check your environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).";
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Initialize Supabase client with authentication support
export const supabase = createClient(supabaseUrl, supabaseAnonKey);