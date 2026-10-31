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

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, EXPIRATION_SECONDS);

    if (error) {
      console.error("[Storage] Error generating signed URL:", error);
      toast.error("No se pudo abrir el archivo.", { description: error.message });
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error("[Storage] Unexpected error during signed URL generation:", e);
    toast.error("No se pudo abrir el archivo.");
    return null;
  }
};