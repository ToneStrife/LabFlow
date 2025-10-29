import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Obtener la configuración de Twilio de los secretos
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER'); // Ej: whatsapp:+14155238886

  if (!twilioSid || !twilioAuthToken || !twilioWhatsappNumber) {
    console.error("TWILIO secrets missing.");
    return new Response(JSON.stringify({ error: 'Server Error: Twilio credentials are not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { to, body } = await req.json();
    
    if (!to || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to or body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Construir el cuerpo de la solicitud para Twilio
    const twilioBody = new URLSearchParams();
    twilioBody.append('To', `whatsapp:${to}`);
    twilioBody.append('From', twilioWhatsappNumber);
    twilioBody.append('Body', body);

    // 3. Enviar la solicitud a la API de Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: twilioBody.toString(),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      console.error('Twilio API error response:', responseBody);
      throw new Error(`Twilio API error (${response.status}): ${responseBody.message || JSON.stringify(responseBody)}`);
    }

    console.log('WhatsApp message sent successfully via Twilio:', responseBody.sid);

    return new Response(JSON.stringify({ message: "WhatsApp message sent successfully.", sid: responseBody.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unhandled error in send-whatsapp function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});