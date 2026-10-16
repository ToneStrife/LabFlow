import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeEmail = (addr: string): string => addr.trim().toLowerCase();

type SmtpRow = {
  id: string;
  email: string;
  smtp_host: string | null;
  smtp_user: string;
  smtp_password: string | null;
  label: string | null;
  updated_at: string;
  updated_by: string | null;
};

const maskAccount = (row: SmtpRow) => ({
  id: row.id,
  email: row.email,
  smtp_host: row.smtp_host,
  smtp_user: row.smtp_user,
  label: row.label,
  updated_at: row.updated_at,
  updated_by: row.updated_by,
  has_password: Boolean(row.smtp_password && String(row.smtp_password).trim()),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Perfil no encontrado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = callerProfile.role === "Admin";
    const callerEmail = callerProfile.email ? normalizeEmail(callerProfile.email) : "";

    let query = supabaseAdmin
      .from("smtp_accounts")
      .select("id, email, smtp_host, smtp_user, smtp_password, label, updated_at, updated_by")
      .order("email", { ascending: true });

    if (!isAdmin) {
      if (!callerEmail) {
        return new Response(JSON.stringify({ accounts: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      query = query.eq("email", callerEmail);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accounts = ((data || []) as SmtpRow[]).map(maskAccount);

    return new Response(JSON.stringify({ accounts }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
