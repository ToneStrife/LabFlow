import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Dirección de correo electrónico para añadir en CC (opcional, mantenida de la versión anterior)
const CC_EMAIL = 'cjaranda@go.ugr.es';

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let logStatus = 'failed';
  let logErrorMessage: string | undefined;
  let sentByUserId: string | undefined;
  let requestBody: any;

  try {
    // 1. Configuración desde Variables de Entorno
    const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const SMTP_PORT = "465"; 
    const SMTP_USER = Deno.env.get("SMTP_USER");
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    const SMTP_FROM = Deno.env.get("SMTP_FROM") || SMTP_USER;

    if (!SMTP_USER || !SMTP_PASSWORD) {
      throw new Error("Configuración SMTP incompleta (SMTP_USER o SMTP_PASSWORD faltantes).");
    }

    // 2. Obtener datos del Body
    requestBody = await req.json();
    const { to, subject, body, attachments, fromName } = requestBody;

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Faltan datos (to, subject o body)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verificación de Seguridad (Supabase Auth)
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      logErrorMessage = "No autorizado";
      return new Response(JSON.stringify({ error: logErrorMessage }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    sentByUserId = user.id;

    // 4. Procesar los archivos adjuntos si existen
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const attachment of attachments) {
        try {
          const filePath = attachment.url; 
          console.log(`[send-email] Descargando adjunto: ${attachment.name} desde: ${filePath}`);

          const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('LabFlow')
            .download(filePath);

          if (downloadError) {
            console.error(`[send-email] Error al descargar ${attachment.name}:`, downloadError);
            continue;
          }

          if (fileBlob) {
            const fileArrayBuffer = await fileBlob.arrayBuffer();
            processedAttachments.push({
              filename: attachment.name,
              content: new Uint8Array(fileArrayBuffer),
            });
          }
        } catch (e) {
          console.error(`[send-email] Error procesando adjunto ${attachment.name}:`, e);
        }
      }
    }

    // 5. Cliente SMTP con SSL Directo (Puerto 465)
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: Number(SMTP_PORT),
        tls: true, 
        auth: {
          username: SMTP_USER!,
          password: SMTP_PASSWORD!,
        },
      },
    });

    // 6. Preparar texto plano y Enviar
    const plainText = body.replace(/<[^>]*>?/gm, "");

    await client.send({
      from: fromName ? `${fromName} <${SMTP_FROM}>` : SMTP_FROM!,
      to,
      cc: CC_EMAIL, // Añadimos el CC configurado
      subject,
      content: plainText,
      html: body,
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    });

    await client.close();
    logStatus = 'success';

    return new Response(
      JSON.stringify({ message: "Email enviado con éxito" }),
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
    // 7. Registrar el intento en la base de datos
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const bodyPreview = requestBody?.body?.substring(0, 247) + '...';

    await supabaseAdmin
      .from('email_logs')
      .insert({
        to_email: requestBody?.to,
        subject: requestBody?.subject,
        body_preview: bodyPreview,
        status: logStatus,
        error_message: logErrorMessage,
        sent_by: sentByUserId,
      });
  }
});