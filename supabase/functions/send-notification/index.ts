import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.8.0'

async function getAccessToken(clientEmail: string, privateKeyPem: string) {
  const scope = 'https://www.googleapis.com/auth/firebase.messaging'
  const aud = 'https://oauth2.googleapis.com/token'

  // jose entiende el PEM directamente (con \n reales)
  const alg = 'RS256'
  const key = await importPKCS8(privateKeyPem, alg)

  const now = Math.floor(Date.now() / 1000)

  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setAudience(aud)
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .sign(key)

  const res = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }
  return data.access_token as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  try {
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID')
    const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL')
    // CRÍTICO: convertir \\n a saltos reales
    const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase environment variables are not set (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).')
    }

    const accessToken = await getAccessToken(FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // El cliente envía 'user_ids' para notificaciones masivas, o 'token' para la prueba unitaria.
    const { token, user_ids, title, body, data: payloadData, link } = await req.json()

    let tokensToSend: string[] = []
    if (token) {
      tokensToSend = [token]
    } else if (user_ids?.length) {
      // Enviar a IDs de usuario específicos
      const { data: tokensData, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token')
        .in('user_id', user_ids);
      if (tokensError) throw tokensError
      tokensToSend = tokensData.map((t: { token: string }) => t.token)
    } else {
      // Si no se especifica token ni user_ids (o user_ids es []), enviar a todos
      const { data: tokensData, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token')
      if (tokensError) throw tokensError
      tokensToSend = tokensData.map((t: { token: string }) => t.token)
    }

    if (tokensToSend.length === 0) {
      return new Response(JSON.stringify({ message: 'No FCM tokens to send to.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`
    const results: Array<{ token: string; success: boolean; status: number; body?: any }> = []

    for (const fcmToken of tokensToSend) {
      const message = {
        message: {
          token: fcmToken,
          // Usar el bloque webpush para mejor compatibilidad con navegadores
          webpush: {
            notification: {
              title: title ?? 'Notificación de LabFlow',
              body: body ?? 'Mensaje de prueba desde el administrador.',
              icon: '/LabFlow/favicon.png', // Asegurar que el icono sea accesible
            },
            fcmOptions: link ? { link } : undefined,
            // Asegurar que los datos se serialicen a strings
            data: {
                ...Object.fromEntries(Object.entries(payloadData || {}).map(([k, v]) => [k, String(v)])),
                link: link || '/dashboard', // Asegurar que el link esté en data para el Service Worker
            },
          },
        },
      }

      const res = await fetch(fcmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(message),
      })

      let bodyJson: any = null
      try { bodyJson = await res.json() } catch {}
      results.push({ token: fcmToken, success: res.ok, status: res.status, body: bodyJson })
      
      // Si falla con 400/404, es probable que el token sea inválido o haya expirado.
      if (!res.ok && (res.status === 400 || res.status === 404)) {
          console.warn(`FCM token ${fcmToken} failed with status ${res.status}. Marking for deletion.`);
          // Aquí podríamos añadir lógica para eliminar el token de la DB si es inválido
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (error: any) {
    console.error('Error in function:', error)
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})