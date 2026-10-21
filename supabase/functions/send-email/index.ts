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

/** Google muestra las App Passwords con espacios; SMTP las quiere sin ellos. */
const normalizeSmtpPassword = (password: string): string =>
  password.replace(/\s+/g, "").trim();

const esHostGmailSmtp = (email: string): boolean => {
  const e = normalizeEmail(email);
  return (
    e.endsWith("@gmail.com") ||
    e.endsWith("@googlemail.com") ||
    e.endsWith("@go.ugr.es") ||
    e.endsWith("@ugr.es")
  );
};

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

/**
 * Versión en texto plano del correo (parte alternativa para clientes sin HTML).
 * Quitar las etiquetas a ciegas pegaba el contenido de las tablas ("PRODUCTOREFERENCIACANT.").
 * Aquí las celdas de una fila van separadas por " | " y cada fila, párrafo y bloque en su línea.
 */
const htmlToPlainText = (html: string): string =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(td|th)>\s*<(td|th)\b[^>]*>/gi, " | ")
    .replace(/<p style="margin:0 0 12px 0;">([\s\S]*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/(p|div|tr|table|ul|ol|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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

    // Varios destinatarios: "a@x.com, b@y.com" o array.
    const toList: string[] = (Array.isArray(to) ? to : String(to).split(/[,;]+/))
      .map((addr: string) => String(addr).trim())
      .filter(Boolean);
    if (toList.length === 0) {
      return new Response(
        JSON.stringify({ error: "Indica al menos un destinatario en Para." }),
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

      const hostGuardado = account.smtp_host && String(account.smtp_host).trim();
      smtpHost =
        hostGuardado ||
        (esHostGmailSmtp(fromNorm) ? "smtp.gmail.com" : SMTP_HOST);
      smtpUser = String(account.smtp_user).trim();
      smtpPassword = normalizeSmtpPassword(String(account.smtp_password));
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

    const plainText = htmlToPlainText(String(body));

    const toNorms = new Set(toList.map((addr) => normalizeEmail(addr)));
    const ccList =
      SMTP_CC && !toNorms.has(normalizeEmail(SMTP_CC)) ? SMTP_CC : undefined;

    const headers: Record<string, string> | undefined = fromEsDistintoDelSmtp
      ? { Sender: smtpUser }
      : undefined;

    // No loguear contraseñas; solo identidad de auth (usuario SMTP).
    console.log(
      `[send-email] De=${fromHeader}` +
        (replyToAddress ? ` Reply-To=${replyToAddress}` : "") +
        ` Para=${toList.join(", ")}` +
        (ccList ? ` CC=${ccList}` : " CC=(ninguno)") +
        ` auth=${smtpUser} host=${smtpHost}`
    );

    await client.send({
      from: fromHeader,
      to: toList.length === 1 ? toList[0] : toList,
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
    const raw = String(err?.message || err || "Error al enviar el correo");
    // Gmail/Workspace: 535 BadCredentials → contraseña de cuenta, no de aplicación, o host mal.
    const esCredenciales =
      /\b535\b/.test(raw) ||
      /BadCredentials/i.test(raw) ||
      /Username and Password not accepted/i.test(raw);
    logErrorMessage = esCredenciales
      ? "El servidor SMTP rechazó usuario o contraseña (535). " +
        "Para niceto@go.ugr.es / @go.ugr.es revisa la contraseña de aplicación de Google " +
        "(cuenta Google → Seguridad → Contraseñas de aplicaciones), " +
        "no la contraseña normal del correo. Host: smtp.gmail.com. " +
        "Guárdala en Perfil → Mi correo de envío o Admin → Cuentas SMTP."
      : raw;
    return new Response(
      JSON.stringify({ error: logErrorMessage }),
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
