import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { initializeApp, cert } from 'https://esm.sh/firebase-admin@11.11.1/app';
import { getMessaging } from 'https://esm.sh/firebase-admin@11.11.1/messaging';

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

const app = initializeApp({
  credential: cert(serviceAccount),
});

const messaging = getMessaging(app);

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
    const { title, body } = await req.json();

    // 1. Obtener todos los tokens de la base de datos
    const { data: tokensData, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token');

    if (tokensError) throw tokensError;

    const tokens = tokensData.map((t) => t.token);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens registered.' }), {
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
      webpush: {
        headers: {
          Urgency: 'high',
        },
      },
      tokens: tokens,
    };

    // 3. Enviar la notificación
    const response = await messaging.sendMulticast(message);

    // 4. Manejar tokens inválidos (opcional: limpiar la base de datos)
    const failedTokens = response.responses
      .filter((r) => !r.success)
      .map((r, index) => tokens[index]);

    if (failedTokens.length > 0) {
      console.log(`Failed to send to ${failedTokens.length} tokens. Consider removing them.`);
      // Lógica para eliminar tokens inválidos de la base de datos si es necesario
    }

    return new Response(JSON.stringify({ success: true, response }), {
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