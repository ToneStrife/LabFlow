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

  // 1. Obtener la configuración de SendGrid de los secretos
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');

  if (!sendgridApiKey) {
    return new Response(JSON.stringify({ error: 'Server Error: SENDGRID_API_KEY is missing in Supabase secrets.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  
  if (!sendgridFromEmail) {
    return new Response(JSON.stringify({ error: 'Server Error: SENDGRID_FROM_EMAIL is missing in Supabase secrets or is invalid. Please set a verified sender email.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let emailLogStatus = 'failed';
  let emailLogError: string | null = null;
  let sentByUserId: string | null = null;
  let toEmail: string = '';
  let subject: string = '';
  let bodyPreview: string = '';
  let attachmentsCount: number = 0;

  try {
    // 2. Autenticar al usuario que llama a la función
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError) {
      emailLogError = `Unauthorized: ${authError.message}`;
      return new Response(JSON.stringify({ error: emailLogError }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    sentByUserId = user?.id || null;

    // 3. Parsear el cuerpo de la solicitud
    const { to, subject: reqSubject, body: reqBody, attachments, fromName } = await req.json();
    toEmail = to;
    subject = reqSubject;
    bodyPreview = reqBody.substring(0, 255); // Store a preview of the body

    if (!to || !reqSubject || !reqBody) {
      emailLogError = 'Missing required fields: to, subject, or body';
      return new Response(JSON.stringify({ error: emailLogError }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Procesar los archivos adjuntos si existen
    const processedAttachments = [];
    if (attachments && attachments.length > 0) {
      attachmentsCount = attachments.length;
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
    const emailData = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: sendgridFromEmail, name: fromName || "LabFlow" },
      subject: reqSubject,
      content: [{ type: 'text/html', value: reqBody }],
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
      emailLogError = `SendGrid API error (${response.status}): ${errorBody}`;
      throw new Error(emailLogError);
    }

    console.log('Email sent successfully via SendGrid.');
    emailLogStatus = 'success';

    return new Response(JSON.stringify({ message: "Email sent successfully." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Unhandled error in send-email function:', error);
    emailLogError = error.message || 'An unexpected error occurred in the Edge Function.';
    return new Response(JSON.stringify({ error: emailLogError }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  } finally {
    // 7. Log the email attempt to Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: logError } = await supabaseAdmin
      .from('sent_emails')
      .insert({
        to_email: toEmail,
        subject: subject,
        body_preview: bodyPreview,
        attachments_count: attachmentsCount,
        status: emailLogStatus,
        error_message: emailLogError,
        sent_by: sentByUserId,
      });

    if (logError) {
      console.error('Error logging email attempt to sent_emails table:', logError);
    }
  }
});