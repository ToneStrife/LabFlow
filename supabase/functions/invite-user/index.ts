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
      console.error('Edge Function: Unauthorized - Missing Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    let payload;
    try {
      // Usar Deno.env.get('SUPABASE_JWT_SECRET') para obtener la clave secreta
      const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
      if (!jwtSecret) {
        console.error('Edge Function: SUPABASE_JWT_SECRET is not set.');
        return new Response(JSON.stringify({ error: 'Server configuration error: JWT secret not found.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      payload = await verify(token, jwtSecret, 'HS256');
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
      console.error('Edge Function: Forbidden - Caller is not an Admin. Profile error:', profileError?.message, 'Caller role:', callerProfile?.role);
      return new Response(JSON.stringify({ error: 'Forbidden: Only Admins can invite new users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, first_name, last_name } = await req.json(); 

    if (!email) {
      console.error('Edge Function: Bad Request - Missing required field: email');
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Invitar al usuario
    const { data: invitedUser, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name }, // Pasar metadatos para el perfil
    });

    if (inviteError) {
      console.error("Edge Function: Supabase inviteUserByEmail error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Edge Function: User invited successfully:', invitedUser.user?.email);
    return new Response(JSON.stringify(invitedUser), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: Unhandled error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});