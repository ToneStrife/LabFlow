import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticar al usuario que llama a la función
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Obtener las credenciales SMTP de los secretos de Supabase
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = Deno.env.get('SMTP_PORT');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      throw new Error('SMTP configuration is missing in Supabase secrets.');
    }

    // 3. Parsear el cuerpo de la solicitud
    const { to, subject, body, attachments } = await req.json();
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, or body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Crear y conectar el cliente SMTP
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: smtpHost,
      port: Number(smtpPort),
      username: smtpUser,
      password: smtpPass,
    });

    // 5. Procesar los archivos adjuntos si existen
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const attachment of attachments) {
        try {
          const url = new URL(attachment.url);
          const filePath = url.pathname.split('/LabFlow/')[1];
          const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('LabFlow')
            .download(decodeURIComponent(filePath));

          if (downloadError) {
            console.error(`Failed to download attachment: ${attachment.name}`, downloadError);
            continue;
          }

          const fileArrayBuffer = await fileBlob.arrayBuffer();
          processedAttachments.push({
            fileName: attachment.name,
            content: new Uint8Array(fileArrayBuffer),
          });
        } catch (e) {
          console.error(`Error processing attachment ${attachment.name}:`, e);
        }
      }
    }

    // 6. Enviar el correo
    await client.send({
      from: `LabFlow <${smtpUser}>`,
      to: to,
      subject: subject,
      html: body,
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    });

    await client.close();

    console.log('Message sent successfully via SMTP.');

    return new Response(JSON.stringify({ message: "Email sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});