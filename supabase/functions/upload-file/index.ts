import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Función para limpiar el nombre del archivo
const sanitizeFilename = (filename: string) => {
  // Reemplaza espacios con guiones bajos y elimina caracteres que no sean alfanuméricos, puntos, guiones bajos o guiones.
  return filename.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
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
    const file = formData.get('file') as File | null;
    const fileType = formData.get('fileType') as string; // 'quote', 'po', 'slip'
    const requestId = formData.get('requestId') as string;
    const poNumber = formData.get('poNumber') as string | null;

    // Verificación de campos obligatorios
    if (!fileType || !requestId) {
      console.error('Edge Function: Missing required fields: fileType or requestId');
      return new Response(JSON.stringify({ error: 'Missing required fields: fileType or requestId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Si es 'po', el número de PO es obligatorio
    if (fileType === 'po' && (!poNumber || poNumber.trim() === '')) {
        console.error('Edge Function: Missing required field: poNumber for PO upload');
        return new Response(JSON.stringify({ error: 'PO Number is required for PO updates.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let filePath: string | null = null;

    if (file && file.size > 0) {
        // Si hay un archivo, proceder con la subida a Storage
        const sanitizedOriginalName = sanitizeFilename(file.name);
        const fileName = `${Date.now()}_${sanitizedOriginalName}`;
        filePath = `${user.id}/${requestId}/${fileName}`; // Organizar por user_id/request_id/file_name

        // Subir el archivo a Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
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

        console.log('Edge Function: File uploaded successfully. Path:', filePath);
    } else if (fileType !== 'po' && fileType !== 'slip') {
        // Si no hay archivo y no es PO/Slip, es un error (Quote es obligatorio)
        return new Response(JSON.stringify({ error: `${fileType} file is required.` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Devolver la RUTA del archivo (filePath) y el número de PO
    return new Response(JSON.stringify({ filePath: filePath, poNumber: poNumber }), {
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