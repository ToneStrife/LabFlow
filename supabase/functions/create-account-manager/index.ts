import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar la clave de rol de servicio
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Verificar el JWT del usuario que llama (debe ser un Admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized: Missing Authorization header', { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      const jwtSecret = Deno.env.get('JWT_SECRET'); // Usar JWT_SECRET
      if (!jwtSecret) {
        console.error('Edge Function: JWT_SECRET is not set.');
        return new Response(JSON.stringify({ error: 'Server configuration error: JWT secret not found.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Importar la clave secreta como CryptoKey
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );

      payload = await verify(token, cryptoKey, 'HS256');
    } catch (jwtError: any) {
      console.error('Edge Function: JWT verification failed:', jwtError.message);
      return new Response(JSON.stringify({ error: `Unauthorized: Invalid token - ${jwtError.message}` }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Opcional: Verificar si el usuario que llama es un Admin (requiere una consulta a la tabla de perfiles)
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', payload.sub)
      .single();

    if (profileError || callerProfile?.role !== 'Admin') {
      return new Response('Forbidden: Only Admins can create account managers', { status: 403, headers: corsHeaders });
    }

    const { email, password, first_name, last_name } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response('Missing required fields: email, password, first_name, last_name', { status: 400, headers: corsHeaders });
    }

    // 2. Crear el usuario en auth.users
    const { data: user, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: { first_name, last_name },
    });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!user?.user?.id) {
      return new Response(JSON.stringify({ error: 'User creation failed, no user ID returned.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 3. Insertar el perfil en public.profiles con el rol de "Account Manager"
    const { data: profile, error: profileInsertError } = await supabaseClient
      .from('profiles')
      .insert({
        id: user.user.id,
        first_name,
        last_name,
        email, // El email se puede almacenar aquí para facilitar las consultas, aunque el principal está en auth.users
        role: 'Account Manager',
      })
      .select()
      .single();

    if (profileInsertError) {
      // Si falla la inserción del perfil, intentar eliminar el usuario creado para evitar inconsistencias
      await supabaseClient.auth.admin.deleteUser(user.user.id);
      return new Response(JSON.stringify({ error: `Failed to create profile: ${profileInsertError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(profile), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});