import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// Helper para convertir la clave privada PEM a un objeto CryptoKey
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Eliminar encabezado/pie de página PEM y saltos de línea
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  // Decodificar base64 a ArrayBuffer
  const binaryDer = atob(base64)
    .split('')
    .map(c => c.charCodeAt(0));
  const keyBuffer = new Uint8Array(binaryDer).buffer;

  // Importar clave como clave privada PKCS#8
  return await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true,
    ['sign']
  );
}

/**
 * Genera un Token de Acceso de Google OAuth 2.0 para FCM usando la aserción de JWT de la Cuenta de Servicio.
 * @returns El token de acceso.
 */
export async function getFCMToken(): Promise<string> {
  const privateKeyPem = Deno.env.get('FIREBASE_PRIVATE_KEY');
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  
  if (!privateKeyPem || !clientEmail) {
    throw new Error('Missing Firebase Service Account credentials in environment variables.');
  }

  const privateKey = await importPrivateKey(privateKeyPem);

  const now = getNumericDate(0);
  const expiration = getNumericDate(3600); // El token expira en 1 hora

  const jwt = await create(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiration,
    },
    privateKey
  );

  // Intercambiar JWT por Access Token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error('OAuth Token Exchange Error:', errorBody);
    throw new Error(`Failed to obtain FCM access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}