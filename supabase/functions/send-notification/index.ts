import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
// Actualizar a una versión más reciente de firebase-admin
import { initializeApp, cert } from 'https://esm.sh/firebase-admin@12.1.0/app?bundle';
import { getMessaging } from 'https://esm.sh/firebase-admin@12.1.0/messaging?bundle';

// Obtener las variables de entorno de Firebase
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY');
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');

if (!FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PROJECT_ID) {
  console.error('Firebase secrets are not set.');
  // Devolver un error 500 si las credenciales no están disponibles
  serve(async () => new Response(JSON.stringify({ error: 'Firebase secrets missing' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
}

// Inicializar Firebase Admin SDK
const serviceAccount = {
  projectId: FIREBASE_PROJECT_ID,
  clientEmail: FIREBASE_CLIENT_EMAIL,
  // La clave privada debe ser decodificada ya que Deno.env.get la devuelve como una sola línea con \n
  privateKey: FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

// Inicializar la aplicación de Firebase
try {
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
} catch (e) {
    // Si la aplicación ya está inicializada (por ejemplo, en un entorno de prueba), ignorar el error.
    if (!e.message.includes('already exists')) {
        console.error('Error initializing Firebase Admin App:', e);
        throw e;
    }
}

const messaging = getMessaging(); // getMessaging() ahora se llama sin el argumento 'app' si solo hay una app inicializada.

// Inicializar Supabase Client para acceder a la base de datos
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
    },
  },
);

// Función para manejar la solicitud
serve(async (req) => {
  // Manejar la solicitud OPTIONS (CORS Preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { user_ids, title, body, link, data: payloadData } = await req.json();

    let tokensToSend: string[] = [];
    let allTokens: { token: string, user_id: string }[] = [];

    // 1. Obtener tokens basados en user_ids o todos los tokens
    if (user_ids && user_ids.length > 0) {
        const { data: tokensData, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('token, user_id')
            .in('user_id', user_ids);

        if (tokensError) throw tokensError;
        allTokens = tokensData;
        tokensToSend = tokensData.map((t) => t.token);
    } else {
        // Si no se especifican user_ids, enviar a todos (comportamiento de broadcast)
        const { data: tokensData, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('token, user_id');

        if (tokensError) throw tokensError;
        allTokens = tokensData;
        tokensToSend = tokensData.map((t) => t.token);
    }


    if (tokensToSend.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens registered or provided.' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 2. Crear el mensaje de notificación
    const message = {
      notification: {
        title: title || 'Notificación de LabFlow',
        body: body || 'Mensaje de prueba enviado desde el administrador.',
      },
      data: {
        ...payloadData,
        link: link || '/dashboard', // Asegurar que el link esté en los datos para el click handler del SW
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
      },
      tokens: tokensToSend,
    };

    // 3. Enviar la notificación
    const response = await messaging.sendMulticast(message);
    
    console.log('FCM Multicast Response:', JSON.stringify(response, null, 2));

    // 4. Manejar tokens inválidos (Limpieza de la base de datos)
    const failedTokens = response.responses
      .map((r, index) => ({ response: r, token: tokensToSend[index] }))
      .filter((item) => !item.response.success)
      .map(item => item.token);

    if (failedTokens.length > 0) {
      console.log(`Attempting to remove ${failedTokens.length} failed tokens from DB.`);
      
      // Eliminar los tokens fallidos de la base de datos
      const { error: deleteError } = await supabase
        .from('fcm_tokens')
        .delete()
        .in('token', failedTokens);

      if (deleteError) {
        console.error('Error deleting failed FCM tokens:', deleteError);
      } else {
        console.log(`${failedTokens.length} failed tokens removed successfully.`);
      }
    }

    return new Response(JSON.stringify({ success: true, response, failedTokens }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});