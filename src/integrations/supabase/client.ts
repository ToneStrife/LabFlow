import { createClient } from '@supabase/supabase-js';

// Intenta leer desde las variables de entorno (Vite)
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !envAnonKey) {
  console.error("❌ Missing Supabase environment variables. Check your .env.local file.");
  throw new Error('Supabase URL or Anon Key is missing.');
}

// Inicializa y exporta el cliente
export const supabase = createClient(envUrl, envAnonKey);
