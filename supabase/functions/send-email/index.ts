import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

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

    // 2. Obtener la configuración de SendGrid de los secretos
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!sendgridApiKey || !sendgridFromEmail) {
      throw new Error('SendGrid configuration is missing in Supabase secrets (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL).');
    }

    // 3. Parsear el cuerpo de la solicitud
    const { to, subject, body, attachments, fromName } = await req.json();
    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, or body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Procesar los archivos adjuntos si existen
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      for (const attachment of attachments) {
        try {
          // CORRECCIÓN: attachment.url es la ruta de almacenamiento (storage path), no una URL completa.
          const filePath = attachment.url; 
          
          console.log(`Attempting to download attachment: ${attachment.name} from path: ${filePath}`);

          const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('LabFlow')
            .download(filePath); // Usar la ruta directamente

          if (downloadError) {
            console.error(`Failed to download attachment: ${attachment.name} at path ${filePath}`, downloadError);
            continue;
          }

          if (!fileBlob) {
            console.error(`File blob is null for attachment: ${attachment.name} at path ${filePath}`);
            continue;
          }

          const fileArrayBuffer = await fileBlob.arrayBuffer();
          const base64Content = encode(fileArrayBuffer);

          processedAttachments.push({
            content: base64Content,
            filename: attachment.name,
            type: fileBlob.type,
            disposition: 'attachment',
          });
        } catch (e) {
          console.error(`Error processing attachment ${attachment.name}:`, e);
        }
      }
    }

    // 5. Construir el payload para la API de SendGrid
    const emailData = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: sendgridFromEmail, name: fromName || "LabFlow" },
      subject: subject,
      content: [{ type: 'text/html', value: body }],
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
    };

    // 6. Enviar la solicitud a la API de SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SendGrid API error (${response.status}): ${errorBody}`);
    }

    console.log('Email sent successfully via SendGrid.');

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