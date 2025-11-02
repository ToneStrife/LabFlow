import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as jose from 'https://deno.land/x/jose@v5.2.4/index.ts'; // Usar jose para JWT

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Vary': 'Origin',
  'Content-Type': 'application/json',
};

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Función para generar el token de acceso JWT para la API v1 de FCM
async function getAccessToken(privateKey: string, clientEmail: string, projectId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + 3600; // Expira en 1 hora

  const payload = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    exp: expiration,
    iat: now,
  };

  // Importar la clave privada
  const key = await jose.importPKCS8(privateKey, 'RS256');

  // Firmar el JWT
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(expiration)
    .sign(key);

  // Intercambiar el JWT por un Access Token de Google
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google OAuth Error:', errorBody);
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Inicializar el cliente de servicio
const getSupabaseAdminClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } },
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: cors,
    });
  }

  // 1. Obtener secretos de Firebase
  const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY');
  const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');

  if (!FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PROJECT_ID) {
    return new Response(JSON.stringify({ error: 'Faltan secretos de Firebase (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID).' }), {
      status: 500, headers: cors,
    });
  }

  try {
    const { user_ids, title, body, link, data: payloadData } = await req.json();
    
    const supabaseAdmin = getSupabaseAdminClient();

    // 2. Carga tokens
    let tokens: string[] = [];
    if (user_ids?.length) {
      const { data, error } = await supabaseAdmin.from('fcm_tokens')
        .select('token')
        .in('user_id', user_ids);
      if (error) throw error;
      tokens = (data ?? []).map(d => d.token);
    } else {
      const { data, error } = await supabaseAdmin.from('fcm_tokens')
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

    // 3. Obtener Access Token (JWT)
    const accessToken = await getAccessToken(FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID);
    const FCM_API_URL = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;

    // 4. Enviar a FCM (API v1)
    const results: any[] = [];
    const failedTokens: string[] = [];

    for (const token of tokens) {
      const messagePayload = {
        message: {
          token: token,
          notification: {
            title: title || 'Notificación de LabFlow',
            body: body || 'Mensaje de prueba.',
          },
          data: { 
            ...(payloadData || {}), 
            link: link || '/dashboard',
            // Necesitamos serializar todos los valores de 'data' a strings para FCM
            ...Object.fromEntries(Object.entries(payloadData || {}).map(([k, v]) => [k, String(v)])),
          },
        },
      };

      const res = await fetch(FCM_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const json = await res.json();
      results.push(json);

      if (!res.ok) {
        console.error(`FCM API v1 Error for token ${token}:`, json);
        failedTokens.push(token);
      }
    }

    // 5. Limpieza de tokens inválidos (la API v1 no devuelve una lista clara de tokens inválidos como la legacy,
    // pero podemos asumir que los que fallaron en el envío son inválidos o temporales)
    if (failedTokens.length) {
      console.log(`Attempting to delete ${failedTokens.length} failed tokens.`);
      await supabaseAdmin.from('fcm_tokens').delete().in('token', failedTokens);
    }

    return new Response(JSON.stringify({
      success: true,
      totalSent: tokens.length - failedTokens.length,
      failedTokensCount: failedTokens.length,
      results: results,
    }), { status: 200, headers: cors });

  } catch (err: any) {
    console.error('Edge Function: Unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: cors,
    });
  }
});