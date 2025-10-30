import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Obtener la clave secreta de Firebase (Server Key)
  const firebaseServerKey = Deno.env.get('FIREBASE_SERVER_KEY');
  if (!firebaseServerKey) {
    return new Response(JSON.stringify({ error: 'Server Error: FIREBASE_SERVER_KEY is missing in Supabase secrets.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    // 2. Autenticar al usuario que llama a la función
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Obtener el token de FCM del usuario actual
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('fcm_tokens')
      .select('token')
      .eq('user_id', user.id)
      .order('last_used', { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      console.error("Error fetching FCM token:", tokenError);
      return new Response(JSON.stringify({ error: 'FCM token not found for user. Please ensure you granted notification permission.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fcmToken = tokenData.token;

    // 4. Construir el payload de la notificación de prueba
    const notificationPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: "🚀 Notificación de Prueba LabFlow",
          body: `¡La configuración de FCM funciona! Enviada a las ${new Date().toLocaleTimeString()}.`,
        },
        webpush: {
          headers: {
            Urgency: 'high',
          },
          notification: {
            icon: 'https://labflow.vercel.app/LabFlow/favicon.png', // Usar una URL absoluta para el icono
          },
        },
        data: {
          test: 'true',
          userId: user.id,
        }
      }
    };

    // 5. Enviar la solicitud a la API HTTP v1 de FCM
    const fcmResponse = await fetch('https://fcm.googleapis.com/v1/projects/labflow-af22c/messages:send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firebaseServerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationPayload),
    });

    if (!fcmResponse.ok) {
      const errorBody = await fcmResponse.json();
      console.error('FCM API error response:', errorBody);
      throw new Error(`FCM API error (${fcmResponse.status}): ${JSON.stringify(errorBody)}`);
    }

    console.log('Test notification sent successfully via FCM.');

    return new Response(JSON.stringify({ message: "Test notification sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in send-test-notification function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});