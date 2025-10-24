import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://syuulozqwzveujlgppml.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFhZWEiLCJyZWYiOiJzeXV1bG96cXd6dmV1amxnYXBtbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYxMjQ3MDkyLCJleHAiOjIwNzY4MjMwOTJ9.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);