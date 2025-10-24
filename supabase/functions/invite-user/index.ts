import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crear un cliente de Supabase con el contexto de autenticación del usuario para verificarlo
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 1. Verificar la sesión del usuario y comprobar su rol
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Edge Function: Authentication error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Crear un cliente con rol de servicio para realizar acciones de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || callerProfile?.role !== 'Admin') {
      console.error('Edge Function: Forbidden - Caller is not an Admin. Profile error:', profileError?.message, 'Caller role:', callerProfile?.role);
      return new Response(JSON.stringify({ error: 'Forbidden: Only Admins can invite new users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // El usuario es un administrador, continuar.
    const { email, first_name, last_name, role } = await req.json();

    if (!email) {
      console.error('Edge Function: Bad Request - Missing required field: email');
      return new Response(JSON.stringify({ error: 'Missing required field: email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Invitar al usuario usando el cliente de administrador
    const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name }, // Pasar metadatos para el perfil
    });

    if (inviteError) {
      console.error("Edge Function: Supabase inviteUserByEmail error:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 3. Si se especificó un rol, actualizar el perfil del usuario invitado
    if (invitedUser.user?.id && role) {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: role })
        .eq('id', invitedUser.user.id);

      if (updateProfileError) {
        console.error("Edge Function: Error updating invited user's profile role:", updateProfileError);
        // No fallar toda la invitación si la actualización del rol falla, pero registrarlo.
      }
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