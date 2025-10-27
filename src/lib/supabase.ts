import { supabase } from '@/integrations/supabase/client';

// Este archivo ahora solo re-exporta el cliente de Supabase inicializado
// en src/integrations/supabase/client.ts para evitar problemas con las variables de entorno.
export { supabase };