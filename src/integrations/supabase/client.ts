import { createBrowserClient } from '@supabase/ssr';

// En entornos Vite, las variables de entorno públicas deben usar el prefijo VITE_
// y ser accedidas a través de import.meta.env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Este es el error que estás viendo.
  throw new Error('Error Supabase URL or Anon Key is missing.');
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);