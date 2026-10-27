import { createClient } from '@supabase/supabase-js';

// Por defecto: proyecto FarBioQ actual. En Vercel (u otro host) se pueden
// pisar con VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY para otro laboratorio.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://[REDACTED].supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6In[REDACTED]Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcwOTIsImV4cCI6MjA3NjgyMzA5Mn0.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
