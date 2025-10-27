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
    // Create a Supabase client with the user's auth context to verify their role
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 1. Verify the caller's session and check their role
    const { data: { user: caller }, error: authError } = await authClient.auth.getUser();
    if (authError || !caller) {
      console.error('Edge Function: Authentication error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create a client with service_role to perform admin actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'Admin') {
      console.error('Edge Function: Forbidden - Caller is not an Admin. Profile error:', profileError?.message, 'Caller role:', callerProfile?.role);
      return new Response(JSON.stringify({ error: 'Forbidden: Only Admins can delete users' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // The caller is an Admin, proceed with deletion
    const { userIdToDelete } = await req.json();

    if (!userIdToDelete) {
      console.error('Edge Function: Bad Request - Missing required field: userIdToDelete');
      return new Response(JSON.stringify({ error: 'Missing required field: userIdToDelete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Prevent an admin from deleting themselves
    if (caller.id === userIdToDelete) {
      return new Response(JSON.stringify({ error: 'Forbidden: An admin cannot delete their own account via this function.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Delete the user from auth.users (this will cascade delete from public.profiles due to foreign key constraint)
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteAuthUserError) {
      console.error("Edge Function: Supabase admin.deleteUser error:", deleteAuthUserError);
      return new Response(JSON.stringify({ error: deleteAuthUserError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log('Edge Function: User deleted successfully:', userIdToDelete);
    return new Response(JSON.stringify({ message: 'User deleted successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Edge Function: Unhandled error in delete-user:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});