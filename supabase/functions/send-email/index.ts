import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET_NAME = "LabFlow";
const CORREO_NICETO = "niceto@go.ugr.es";

const normalizeEmail = (addr: string): string => addr.trim().toLowerCase();

const resolveStoragePath = (urlOrPath: string): string => {
  if (!urlOrPath.startsWith("http://") && !urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }

  try {
    const parsed = new URL(urlOrPath);
    const signMarker = "/object/sign/LabFlow/";
    const publicMarker = "/object/public/LabFlow/";
    const signIndex = parsed.pathname.indexOf(signMarker);
    if (signIndex !== -1) {
      return decodeURIComponent(parsed.pathname.slice(signIndex + signMarker.length).split("?")[0]);
    }
    const publicIndex = parsed.pathname.indexOf(publicMarker);
    if (publicIndex !== -1) {
      return decodeURIComponent(parsed.pathname.slice(publicIndex + publicMarker.length).split("?")[0]);
    }
  } catch {
    // fall through
  }

  return urlOrPath;
};

const getContentType = (filename: string): string => {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logStatus = "failed";
  let logErrorMessage: string | undefined;
  let sentByUserId: string | undefined;
  let requestBody: any;

  try {
    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const SMTP_PORT = "465";
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;
    // CC opcional: vacío/ausente = sin CC. No confundir CC con el remitente (From).
    const SMTP_CC = (Deno.env.get("SMTP_CC") || "").trim();

    if (!SMTP_USER || !SMTP_PASSWORD) {
      throw new Error("Configuración SMTP incompleta (SMTP_USER o SMTP_PASSWORD faltantes).");
    }

    requestBody = await req.json();
    const { to, subject, body, attachments, fromName, from } = requestBody;

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Faltan datos (to, subject o body)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      logErrorMessage = "No autorizado";
      return new Response(JSON.stringify({ error: logErrorMessage }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    sentByUserId = user.id;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const defaultIdentities = new Set(
      [SMTP_FROM, SMTP_USER].filter(Boolean).map((a) => normalizeEmail(String(a)))
    );

    const fromPedido = typeof from === "string" ? from.trim() : "";
    const fromAddress = fromPedido || SMTP_FROM!;
    const fromNorm = normalizeEmail(fromAddress);
    const usesDefaultSmtp = defaultIdentities.has(fromNorm);

    // Credenciales: cuenta por defecto (env) o fila en smtp_accounts (service role).
    let smtpHost = SMTP_HOST;
    let smtpUser = SMTP_USER!;
    let smtpPassword = SMTP_PASSWORD!;

    if (!usesDefaultSmtp) {
      const { data: account, error: accountError } = await supabaseAdmin
        .from("smtp_accounts")
        .select("email, smtp_host, smtp_user, smtp_password")
        .eq("email", fromNorm)
        .maybeSingle();

      if (accountError) {
        throw new Error(`No se pudo consultar la cuenta SMTP: ${accountError.message}`);
      }

      if (!account) {
        return new Response(
          JSON.stringify({
            error:
              `No hay cuenta SMTP configurada para ${fromAddress}. ` +
              `Un administrador (o el dueño del buzón) debe añadirla en LabFlow → Cuentas SMTP / Mi correo de envío.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!account.smtp_password || !String(account.smtp_password).trim()) {
        return new Response(
          JSON.stringify({
            error:
              `La cuenta SMTP de ${fromAddress} aún no tiene contraseña. ` +
              `Configúrala en Perfil → Mi correo de envío (o Admin → Cuentas SMTP).`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!account.smtp_user || !String(account.smtp_user).trim()) {
        return new Response(
          JSON.stringify({
            error: `La cuenta SMTP de ${fromAddress} no tiene usuario SMTP configurado.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      smtpHost = (account.smtp_host && String(account.smtp_host).trim()) || SMTP_HOST;
      smtpUser = String(account.smtp_user).trim();
      smtpPassword = String(account.smtp_password);
    }

    // Remitentes permitidos: default + niceto@ + cualquier email en smtp_accounts.
    const { data: accountEmails } = await supabaseAdmin
      .from("smtp_accounts")
      .select("email");

    const remitentesPermitidos = new Set([
      ...defaultIdentities,
      normalizeEmail(CORREO_NICETO),
      ...(accountEmails || []).map((row: { email: string }) => normalizeEmail(row.email)),
    ]);

    if (fromPedido && !remitentesPermitidos.has(normalizeEmail(fromPedido))) {
      return new Response(
        JSON.stringify({ error: `Remitente no permitido: ${fromPedido}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromHeader = fromName ? `${fromName} <${fromAddress}>` : fromAddress;

    // Reply-To si el From no coincide con el usuario SMTP autenticado (fallback UGR).
    const fromEsDistintoDelSmtp = normalizeEmail(fromAddress) !== normalizeEmail(smtpUser);
    const replyToAddress = fromEsDistintoDelSmtp ? fromAddress : undefined;

    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        const filePath = resolveStoragePath(attachment.url);
        console.log(`[send-email] Descargando adjunto: ${attachment.name} desde: ${filePath}`);

        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .download(filePath);

        if (downloadError) {
          throw new Error(`No se pudo descargar el adjunto "${attachment.name}": ${downloadError.message}`);
        }

        if (!fileBlob || fileBlob.size === 0) {
          throw new Error(`El adjunto "${attachment.name}" está vacío o no es válido.`);
        }

        const fileArrayBuffer = await fileBlob.arrayBuffer();
        console.log(`[send-email] Adjunto listo: ${attachment.name} (${fileBlob.size} bytes)`);
        processedAttachments.push({
          filename: attachment.name,
          content: new Uint8Array(fileArrayBuffer),
          contentType: getContentType(attachment.name),
          encoding: "binary",
        });
      }
    }

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: Number(SMTP_PORT),
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    const plainText = body.replace(/<[^>]*>?/gm, "");

    const toNorm = normalizeEmail(String(to));
    const ccList =
      SMTP_CC && normalizeEmail(SMTP_CC) !== toNorm ? SMTP_CC : undefined;

    const headers: Record<string, string> | undefined = fromEsDistintoDelSmtp
      ? { Sender: smtpUser }
      : undefined;

    // No loguear contraseñas; solo identidad de auth (usuario SMTP).
    console.log(
      `[send-email] De=${fromHeader}` +
        (replyToAddress ? ` Reply-To=${replyToAddress}` : "") +
        (ccList ? ` CC=${ccList}` : " CC=(ninguno)") +
        ` auth=${smtpUser} host=${smtpHost}`
    );

    await client.send({
      from: fromHeader,
      to,
      ...(ccList ? { cc: ccList } : {}),
      ...(replyToAddress ? { replyTo: replyToAddress } : {}),
      ...(headers ? { headers } : {}),
      subject,
      content: plainText,
      html: body,
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    });

    await client.close();
    logStatus = "success";

    return new Response(
      JSON.stringify({
        message: "Email enviado con éxito",
        from: fromAddress,
        replyTo: replyToAddress ?? null,
        smtpAccount: usesDefaultSmtp ? "default" : fromNorm,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[send-email] Error crítico:", err.message);
    logErrorMessage = err.message;
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const bodyPreview = requestBody?.body?.substring(0, 247) + "...";

    await supabaseAdmin.from("email_logs").insert({
      to_email: requestBody?.to,
      subject: requestBody?.subject,
      body_preview: bodyPreview,
      status: logStatus,
      error_message: logErrorMessage,
      sent_by: sentByUserId,
    });
  }
});
