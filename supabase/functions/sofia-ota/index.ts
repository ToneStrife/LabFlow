// sofia-ota: la placa pide aquí el programa nuevo que le toca.
//
// La placa llama con la clave pública de la app (como al resto de Supabase) y
// su token propio en la cabecera x-sofia-token. Se comprueba el token, se mira
// qué versión le toca (la última publicada, o la que tenga fijada) y se
// devuelve un enlace firmado al .bin que caduca en 10 minutos. El .bin vive en
// un almacenamiento privado: nunca se puede bajar sin pasar por aquí.
//
// Respuesta: { version, md5, size, url }  o  204 si no hay nada que bajar.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const BUCKET = "sofia-firmware";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "metodo no permitido" }, 405);

  const token = req.headers.get("x-sofia-token") ?? "";
  if (token.length < 20) return json({ error: "falta el token de la placa" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false },
  });

  const { data: destino, error } = await admin.rpc("sofia_ota_destino", { p_token: token });
  if (error) {
    const msg = error.message ?? "";
    const status = msg.includes("no registrado") || msg.includes("token no valido") ? 401 : 500;
    return json({ error: msg.replace(/^sofia: /, "") }, status);
  }
  if (!destino) return new Response(null, { status: 204 });

  const { data: firmado, error: errUrl } = await admin.storage.from(BUCKET).createSignedUrl(destino.path, 600);
  if (errUrl || !firmado?.signedUrl) return json({ error: "no se pudo preparar la descarga: " + (errUrl?.message ?? "") }, 500);

  return json({ version: destino.version, md5: destino.md5, size: destino.size, url: firmado.signedUrl });
});
