// Edge-safe: sin firebase-admin. Envía FCM por HTTP (legacy API).

const ALLOWED_ORIGIN = '*'; // Cambiado a '*' para permitir localhost y despliegues

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
};

// Usar la versión 2.45.0 para consistencia
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');

Deno.serve(async (req) => {
  // 1) CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: cors,
    });
  }

  try {
    const { user_ids, title, body, link, data: payloadData } = await req.json();

    // Cliente supabase dentro del handler
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // 2) Carga tokens desde tu tabla
    let tokens: string[] = [];
    if (user_ids?.length) {
      const { data, error } = await supabase.from('fcm_tokens')
        .select('token')
        .in('user_id', user_ids);
      if (error) throw error;
      tokens = (data ?? []).map(d => d.token);
    } else {
      const { data, error } = await supabase.from('fcm_tokens')
        .select('token');
      if (error) throw error;
      tokens = (data ?? []).map(d => d.token);
    }

    if (!tokens.length) {
      return new Response(JSON.stringify({ message: 'No hay tokens registrados.' }), {
        status: 200,
        headers: cors,
      });
    }

    // 3) Enviar a FCM (legacy)
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    if (!FCM_SERVER_KEY) {
      return new Response(JSON.stringify({ error: 'Falta FCM_SERVER_KEY en variables de entorno' }), {
        status: 500, headers: cors,
      });
    }

    // Mandamos en lotes de hasta 1000 tokens por petición (límite legacy)
    const chunk = <T>(arr: T[], size: number) =>
      arr.length ? [arr.slice(0, size), ...chunk(arr.slice(size), size)] : [];

    const batches = chunk(tokens, 1000);
    const results: any[] = [];
    const failedTokens: string[] = [];

    for (const batch of batches) {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title: title || 'Notificación de LabFlow',
            body: body || 'Mensaje de prueba enviado desde el administrador.',
          },
          data: { ...(payloadData || {}), link: link || '/dashboard' },
          priority: 'high',
        }),
      });

      if (!res.ok) {
        throw new Error(`FCM error: ${res.status} ${await res.text()}`);
      }
      const json = await res.json();
      results.push(json);

      // Marcar tokens fallidos (si los hay)
      // Respuesta legacy: results[i] puede tener { error: 'NotRegistered' | 'InvalidRegistration' | ... }
      if (Array.isArray(json.results)) {
        json.results.forEach((r: any, i: number) => {
          if (r && r.error) failedTokens.push(batch[i]);
        });
      }
    }

    // 4) Limpieza de tokens inválidos
    if (failedTokens.length) {
      await supabase.from('fcm_tokens').delete().in('token', failedTokens);
    }

    return new Response(JSON.stringify({
      success: true,
      batches: results.length,
      failedTokensCount: failedTokens.length,
    }), { status: 200, headers: cors });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: cors,
    });
  }
});