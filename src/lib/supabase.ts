import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_SUPABASE_URL")) {
  console.error("Supabase URL and Anon Key must be defined in your .env.local file");
  // We'll return a mock client to prevent the app from crashing
  // This allows the user to see the app while they are adding their keys
  const mockSupabase = {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      insert: async () => ({ data: [], error: null }),
      update: async () => ({ data: [], error: null }),
      delete: async () => ({ data: [], error: null }),
    }),
    functions: {
      invoke: async () => ({ data: null, error: { message: "Supabase not configured. Please add your keys to .env.local" } })
    }
  };
  // @ts-ignore
  return mockSupabase as ReturnType<typeof createClient>;
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey)