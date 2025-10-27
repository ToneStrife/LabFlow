import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fallback for Dyad environment or if VITE variables are missing locally
  const DYAD_SUPABASE_URL = "https://syuulozqwzveujlgppml.supabase.co";
  const DYAD_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5dXVsb3pxd3p2ZXVqbGdwcG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcwOTIsImV4cCI6MjA3NjgyMzA5Mn0.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";
  
  if (!DYAD_SUPABASE_URL || !DYAD_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase URL or Anon Key environment variables.");
    throw new Error('Supabase URL is required.');
  }
  
  export const supabase = createClient(DYAD_SUPABASE_URL, DYAD_SUPABASE_ANON_KEY);
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}