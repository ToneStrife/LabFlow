import { createClient } from '@supabase/supabase-js';

// Accede a las variables de entorno usando import.meta.env para entornos de navegador (Vite).
// Se mantienen los nombres de variables de entorno (NEXT_PUBLIC_ o REACT_APP_) por compatibilidad.
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key environment variables.');
}

// Inicializa el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);