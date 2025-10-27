import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Esto solo debería ocurrir si las variables no están configuradas en .env.local o en el entorno de producción.
  console.error("Missing Supabase URL or Anon Key environment variables.");
  // Usamos las claves codificadas como fallback para el entorno de Dyad si es necesario, 
  // pero en un entorno real, esto fallaría. Para Dyad, usaremos las variables inyectadas.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);