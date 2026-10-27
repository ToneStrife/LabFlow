import { createClient } from '@supabase/supabase-js';

function looksLikeSupabaseHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v === "undefined" || v === "null" || v.includes("[")) return false;
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
  return v.startsWith("eyJ") && v.length > 20 && !v.includes("[");
}

/**
 * Credenciales públicas (anon). En Vercel / CI definir:
 *   VITE_SUPABASE_URL=https://<ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon JWT>
 * La integración Vercel↔Supabase a veces mete postgresql:// o vacías: se ignoran.
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

const SUPABASE_URL = looksLikeSupabaseHttpUrl(envUrl) ? envUrl.trim() : "";
const SUPABASE_PUBLISHABLE_KEY = looksLikeAnonKey(envKey) ? envKey.trim() : "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Evita el crash opaco de supabase-js ("URL is malformed") con un mensaje claro.
  throw new Error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
      "En Vercel: Settings → Environment Variables (URL https://….supabase.co y la anon key)."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
