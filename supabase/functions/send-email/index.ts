import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dirección de correo electrónico para añadir en CC
const CC_EMAIL = 'cjaranda@go.ugr.es';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Obtener la configuración de SendGrid de los secretos
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');

  if (!sendgridApiKey) {
    return new Response(JSON.stringify({ error: 'Server Error: SENDGRID_API_KEY is missing in Supabase secrets.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  
  if (!sendgridFromEmail) {
    return new Response(JSON.stringify({ error: 'Server Error: SENDGRID_FROM_EMAIL is missing in Supabase secrets or is invalid. Please set a verified sender email.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let logStatus = 'failed';
  let logErrorMessage: string | undefined;
  let sentByUserId: string | undefined;
  let requestBody: any; // Variable para almacenar el cuerpo de la solicitud

  try {
    // Leer el cuerpo de la solicitud UNA SOLA VEZ
    requestBody = await req.json();
    const { to, subject, body, attachments, fromName } = requestBody;

    // 2. Autenticar al usuario que llama a la función
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError) {
      logErrorMessage = `Unauthorized: ${authError.message}`;
      return new Response(JSON.stringify({ error: logErrorMessage }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    sentByUserId = user?.id;

    // 3. Parsear el cuerpo de la solicitud (ya hecho, usar variables)
    if (!to || !subject || !body) {
      logErrorMessage = 'Missing required fields: to, subject, or body';
      return new Response(JSON.stringify({ error: logErrorMessage }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
          const filePath = attachment.url; 
          
          console.log(`Attempting to download attachment: ${attachment.name} from path: ${filePath}`);

          const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
            .from('LabFlow')
            .download(filePath);

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
    const personalizations = [{ to: [{ email: to }], cc: [{ email: CC_EMAIL }] }]; // Añadir CC aquí

    const emailData = {
      personalizations: personalizations,
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
      console.error('SendGrid API error response:', errorBody);
      logErrorMessage = `SendGrid API error (${response.status}): ${errorBody}`;
      throw new Error(logErrorMessage);
    }

    console.log('Email sent successfully via SendGrid.');
    logStatus = 'success'; // Mark as success if no error was thrown

    return new Response(JSON.stringify({ message: "Email sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error in send-email function:', error);
    logErrorMessage = error.message || 'An unexpected error occurred in the Edge Function.';
    return new Response(JSON.stringify({ error: logErrorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // 7. Log the email attempt to Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Usar la variable requestBody que ya contiene los datos
    const to = requestBody?.to;
    const subject = requestBody?.subject;
    const body = requestBody?.body;

    const bodyPreview = body && body.length > 250 ? body.substring(0, 247) + '...' : body;

    const { error: logError } = await supabaseAdmin
      .from('email_logs')
      .insert({
        to_email: to,
        subject: subject,
        body_preview: bodyPreview,
        status: logStatus,
        error_message: logErrorMessage,
        sent_by: sentByUserId,
      });

    if (logError) {
      console.error('Error logging email to Supabase:', logError);
    }
  }
});