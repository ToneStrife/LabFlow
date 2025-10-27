import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const BUCKET_NAME = "LabFlow";
const EXPIRATION_SECONDS = 60; // URL válida por 60 segundos

/**
 * Genera una URL firmada para un archivo privado en Supabase Storage.
 * @param filePath La ruta del archivo almacenada en la base de datos (ej: user_id/request_id/file_type/file_name.pdf)
 * @returns La URL firmada o null si falla.
 */
export const generateSignedUrl = async (filePath: string): Promise<string | null> => {
  if (!filePath) return null;

  console.log(`[Storage] Attempting to generate signed URL for path: ${filePath}`);

  try {
    // El SDK de Supabase maneja la codificación de la ruta, pero a veces es mejor
    // asegurarse de que la ruta esté limpia antes de pasarla.
    // Sin embargo, para evitar doble codificación, confiaremos en el SDK.
    // Si el problema persiste, es probable que el archivo no exista en la ruta exacta.
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, EXPIRATION_SECONDS);

    if (error) {
      console.error("[Storage] Error generating signed URL:", error);
      toast.error("Failed to generate secure file link.", { description: error.message });
      return null;
    }

    console.log(`[Storage] Successfully generated signed URL for path: ${filePath}`);
    return data.signedUrl;
  } catch (e) {
    console.error("[Storage] Unexpected error during signed URL generation:", e);
    toast.error("An unexpected error occurred while securing the file link.");
    return null;
  }
};