import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5.8.0'

async function getAccessToken(clientEmail: string, privateKeyPem: string) {
  const scope = 'https://www.googleapis.com/auth/firebase.messaging'
  const aud = 'https://oauth2.googleapis.com/token'

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

type TokenRow = {
  token: string
  user_id: string | null
  last_used?: string | null
  created_at?: string | null
}

/** Un token por usuario (el más reciente). Evita la doble alerta por tokens viejos. */
function latestTokenPerUser(rows: TokenRow[]): string[] {
  const best = new Map<string, TokenRow>()
  const orphans: string[] = []

  for (const row of rows) {
    if (!row.user_id) {
      orphans.push(row.token)
      continue
    }
    const prev = best.get(row.user_id)
    if (!prev) {
      best.set(row.user_id, row)
      continue
    }
    const prevTs = Date.parse(prev.last_used || prev.created_at || '') || 0
    const nextTs = Date.parse(row.last_used || row.created_at || '') || 0
    if (nextTs >= prevTs) best.set(row.user_id, row)
  }

  return [...Array.from(best.values()).map((r) => r.token), ...orphans]
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

    const { token, user_ids, title, body, data: payloadData, link } = await req.json()

    let tokensToSend: string[] = []
    if (token) {
      tokensToSend = [token]
    } else if (user_ids?.length) {
      const { data: tokensData, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token, user_id, last_used, created_at')
        .in('user_id', user_ids)
      if (tokensError) throw tokensError
      tokensToSend = latestTokenPerUser((tokensData || []) as TokenRow[])
    } else {
      const { data: tokensData, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token, user_id, last_used, created_at')
      if (tokensError) throw tokensError
      tokensToSend = latestTokenPerUser((tokensData || []) as TokenRow[])
    }

    // Por si hubiera el mismo token repetido
    tokensToSend = [...new Set(tokensToSend)]

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
          webpush: {
            notification: {
              title: title ?? 'Notificación de LabFlow',
              body: body ?? 'Mensaje de prueba desde el administrador.',
              icon: '/LabFlow/favicon.png',
            },
            fcmOptions: link ? { link } : undefined,
            data: {
                ...Object.fromEntries(Object.entries(payloadData || {}).map(([k, v]) => [k, String(v)])),
                link: link || '/dashboard',
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

      if (!res.ok && (res.status === 400 || res.status === 404)) {
          console.warn(`FCM token ${fcmToken} failed with status ${res.status}. Deleting from DB.`)
          const { error: deleteError } = await supabase
            .from('fcm_tokens')
            .delete()
            .eq('token', fcmToken)
          if (deleteError) {
              console.error(`Failed to delete invalid token ${fcmToken}:`, deleteError)
          } else {
              console.log(`Successfully deleted invalid token: ${fcmToken}`)
          }
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
