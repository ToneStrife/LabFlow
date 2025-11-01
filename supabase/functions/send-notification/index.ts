import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getFCMToken } from '../_shared/fcm-auth.ts'; // Import the auth helper

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let logErrorMessage: string | undefined;
  let sentByUserId: string | undefined;
  let requestBody: any;

  try {
    // 1. Authenticate the caller
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      logErrorMessage = `Unauthorized: ${authError.message}`;
      return new Response(JSON.stringify({ error: logErrorMessage }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    sentByUserId = user.id;

    // 2. Get request body (FCM message payload)
    requestBody = await req.json();
    const { token, title, body, data } = requestBody;

    if (!token || !title || !body) {
      logErrorMessage = 'Missing required fields: token, title, or body in payload.';
      return new Response(JSON.stringify({ error: logErrorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Obtain FCM Access Token using OAuth 2.0 JWT Assertion
    const accessToken = await getFCMToken();
    const firebaseProjectId = Deno.env.get('FIREBASE_PROJECT_ID');

    if (!firebaseProjectId) {
        logErrorMessage = 'Server Error: FIREBASE_PROJECT_ID is missing in Supabase secrets.';
        return new Response(JSON.stringify({ error: logErrorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Construct FCM HTTP v1 Payload
    const fcmPayload = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body,
        },
        data: data,
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            // Usar una URL pública para el icono (reemplaza con tu URL de almacenamiento si es diferente)
            icon: 'https://syuulozqwzveujlgppml.supabase.co/storage/v1/object/public/LabFlow/favicon.png', 
          },
        },
      }
    };

    // 5. Send the notification via FCM HTTP v1 API
    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    if (!fcmResponse.ok) {
      const errorBody = await fcmResponse.json();
      console.error('FCM API error response:', errorBody);
      logErrorMessage = `FCM API error (${fcmResponse.status}): ${JSON.stringify(errorBody)}`;
      throw new Error(logErrorMessage);
    }

    console.log('Notification sent successfully via FCM v1.');

    return new Response(JSON.stringify({ message: "Notification sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error in send-notification function:', error);
    logErrorMessage = error.message || 'An unexpected error occurred in the Edge Function.';
    return new Response(JSON.stringify({ error: logErrorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});