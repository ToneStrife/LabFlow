import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Crear un cliente de Supabase con el contexto de autenticación del usuario para verificarlo
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 1. Verificar la sesión del usuario
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error('Edge Function: Authentication error', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Crear un cliente con rol de servicio para interactuar con Storage de forma segura
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parsear el FormData para obtener el archivo y los metadatos
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string; // 'quote', 'po', 'slip'
    const requestId = formData.get('requestId') as string;
    const poNumber = formData.get('poNumber') as string | null;

    // Verificación mejorada para el archivo y su nombre
    if (!file || typeof file.name === 'undefined' || !fileType || !requestId) {
      console.error('Edge Function: Missing required fields or invalid file object:', { file: !!file, fileName: file?.name, fileType, requestId });
      return new Response(JSON.stringify({ error: 'Missing required fields or invalid file object: file, fileType, or requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generar un nombre de archivo único y una ruta en el bucket
    const fileExtension = file.name.split('.').pop();
    const fileName = `${fileType}-${requestId}-${Date.now()}.${fileExtension}`;
    const filePath = `${user.id}/${requestId}/${fileName}`; // Organizar por user_id/request_id/file_name

    // Subir el archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('LabFlow') // Usar el nombre del bucket 'LabFlow'
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Permite sobrescribir si el archivo ya existe
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Edge Function: Supabase Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('LabFlow')
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error('Edge Function: Failed to get public URL for file:', filePath);
      return new Response(JSON.stringify({ error: 'Failed to get public URL for the uploaded file.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('Edge Function: File uploaded successfully:', publicUrlData.publicUrl);
    return new Response(JSON.stringify({ fileUrl: publicUrlData.publicUrl, poNumber: poNumber }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Edge Function: Unhandled error in upload-file:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred in the Edge Function.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});