import { createClient } from '@supabase/supabase-js';

// Fallback keys for Dyad environment
const DYAD_SUPABASE_URL = "https://syuulozqwzveujlgppml.supabase.co";
const DYAD_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5dXVsb3pxd3p2ZXVqbGdwcG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcwOTIsImV4cCI6MjA3NjgyMzA5Mn0.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";

<<<<<<< HEAD
// Try to load VITE environment variables first
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Determine final values
const finalSupabaseUrl = envUrl || DYAD_SUPABASE_URL;
const finalSupabaseAnonKey = envAnonKey || DYAD_SUPABASE_ANON_KEY;

if (!finalSupabaseUrl || !finalSupabaseAnonKey) {
  console.error("Missing Supabase URL or Anon Key environment variables.");
  throw new Error('Supabase URL is required.');
}

// Initialize and export the client unconditionally
export const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey);
=======
if (!supabaseUrl || !supabaseAnonKey) {
  // Esto solo debería ocurrir si las variables no están configuradas en .env.local o en el entorno de producción.
  console.error("Missing Supabase URL or Anon Key environment variables.");
  // Usamos las claves codificadas como fallback para el entorno de Dyad si es necesario, 
  // pero en un entorno real, esto fallaría. Para Dyad, usaremos las variables inyectadas.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
>>>>>>> parent of ff1365e ([dyad] Corrigiendo la inicialización del cliente Supabase con variables de entorno VITE_. - wrote 1 file(s))
