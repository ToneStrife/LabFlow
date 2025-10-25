import { createClient } from '@supabase/supabase-js';

// Accede a las variables de entorno usando import.meta.env para entornos de navegador (Vite).
// En Vite, las variables de entorno deben comenzar con VITE_ para ser expuestas al cliente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key environment variables.');
}

// Inicializa el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);