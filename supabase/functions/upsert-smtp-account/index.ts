import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const normalizeEmail = (addr: string): string => addr.trim().toLowerCase();

const normalizeSmtpPassword = (password: string): string =>
  password.replace(/\s+/g, "").trim();

const esGoogleWorkspaceUgr = (email: string): boolean => {
  const e = normalizeEmail(email);
  return e.endsWith("@go.ugr.es") || e.endsWith("@ugr.es");
};

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

    const body = await req.json();
    const emailRaw = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(emailRaw);
    const smtp_user = typeof body.smtp_user === "string" ? body.smtp_user.trim() : "";
    let smtp_host =
      typeof body.smtp_host === "string" && body.smtp_host.trim()
        ? body.smtp_host.trim()
        : null;
    if (!smtp_host && esGoogleWorkspaceUgr(emailRaw || "")) {
      smtp_host = "smtp.gmail.com";
    }
    const label =
      typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;
    const passwordRaw =
      typeof body.smtp_password === "string"
        ? normalizeSmtpPassword(body.smtp_password)
        : "";
    // Contraseña vacía = conservar la existente (no borrar).
    const wantsPasswordUpdate = passwordRaw.length > 0;

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!smtp_user) {
      return new Response(JSON.stringify({ error: "El usuario SMTP es obligatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin && email !== callerEmail) {
      return new Response(
        JSON.stringify({
          error: "Solo puedes configurar la cuenta SMTP de tu propio correo.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("smtp_accounts")
      .select("id, smtp_password")
      .eq("email", email)
      .maybeSingle();

    if (!existing && !wantsPasswordUpdate) {
      return new Response(
        JSON.stringify({
          error: "Al crear la cuenta debes indicar la contraseña SMTP.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: Record<string, unknown> = {
      email,
      smtp_user,
      smtp_host,
      label,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (wantsPasswordUpdate) {
      payload.smtp_password = passwordRaw;
    } else if (!existing) {
      payload.smtp_password = "";
    }

    let saved: {
      id: string;
      email: string;
      smtp_host: string | null;
      smtp_user: string;
      smtp_password: string | null;
      label: string | null;
      updated_at: string;
      updated_by: string | null;
    } | null = null;

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("smtp_accounts")
        .update(payload)
        .eq("id", existing.id)
        .select("id, email, smtp_host, smtp_user, smtp_password, label, updated_at, updated_by")
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      saved = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("smtp_accounts")
        .insert(payload)
        .select("id, email, smtp_host, smtp_user, smtp_password, label, updated_at, updated_by")
        .single();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      saved = data;
    }

    // Nunca devolver la contraseña en claro.
    return new Response(
      JSON.stringify({
        account: {
          id: saved!.id,
          email: saved!.email,
          smtp_host: saved!.smtp_host,
          smtp_user: saved!.smtp_user,
          label: saved!.label,
          updated_at: saved!.updated_at,
          updated_by: saved!.updated_by,
          has_password: Boolean(saved!.smtp_password && String(saved!.smtp_password).trim()),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
