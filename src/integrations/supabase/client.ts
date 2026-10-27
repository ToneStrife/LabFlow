import { createClient } from '@supabase/supabase-js';

/** Proyecto FarBioQ (producción actual). */
const FALLBACK_SUPABASE_URL = "https://[REDACTED].supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6In[REDACTED]Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDcwOTIsImV4cCI6MjA3NjgyMzA5Mn0.TH9w7Ai-Pt0wjd845Gbq5Vgaw1eAxYr8u0LjoKe9BBA";

function looksLikeSupabaseHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v === "undefined" || v === "null") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function looksLikeAnonKey(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.length > 20 && v !== "undefined" && v !== "null";
}

/**
 * En Vercel la integración Supabase a veces mete vars vacías o la URL de
 * Postgres (postgresql://…). Solo aceptamos https y key JWT-like; si no, FarBioQ.
 */
const envUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL;

const envKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = looksLikeSupabaseHttpUrl(envUrl) ? envUrl.trim() : FALLBACK_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = looksLikeAnonKey(envKey) ? envKey.trim() : FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
