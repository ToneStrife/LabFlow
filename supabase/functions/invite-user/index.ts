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
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { status: 401, headers: corsHeaders, 'Content-Type': 'application/json' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await verify(token, Deno.env.get('SUPABASE_JWT_SECRET') ?? '', 'HS256');

    // Opcional: Verificar si el usuario que llama es un Admin (requiere una consulta a la tabla de perfiles)
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', payload.sub)
      .single();

    if (profileError || callerProfile?.role !== 'Admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only Admins can invite new users' }), { status: 403, headers: corsHeaders, 'Content-Type': 'application/json' });
    }

    // Ya no destructuramos clientRedirectTo
    const { email, first_name, last_name } = await req.json(); 

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), { status: 400, headers: corsHeaders, 'Content-Type': 'application/json' });
    }

    // 2. Invitar al usuario
    // Al no pasar 'redirectTo', Supabase usará la URL de redirección por defecto del proyecto.
    const { data: invitedUser, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name }, // Pasar metadatos para el perfil
      // redirectTo: finalRedirectTo, // Eliminado para evitar el error de URL no autorizada
    });

    if (inviteError) {
      console.error("Supabase inviteUserByEmail error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify(invitedUser), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});