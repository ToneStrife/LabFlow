import { createBrowserClient } from '@supabase/ssr';

// Las variables de entorno deben tener el prefijo NEXT_PUBLIC_ para ser accesibles en el cliente.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Este es el error que estás viendo.
  throw new Error('Error Supabase URL or Anon Key is missing.');
}

export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);