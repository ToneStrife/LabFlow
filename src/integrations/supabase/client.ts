import { createClient } from '@supabase/supabase-js';

// Credenciales directas del proyecto para asegurar la conectividad en el entorno de desarrollo
const SUPABASE_URL = "https://syuulozqwzveujlgppml.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5dXVsb3pxd3p2ZXVqbGdwcG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcwOTIsImV4cCI6MjA3NjgyMzA5Mn0.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);