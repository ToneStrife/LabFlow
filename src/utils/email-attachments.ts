import { generateSignedUrl } from "@/utils/supabase-storage";

export interface EmailAttachment {
  name: string;
  url: string;
}

export const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "Archivo";
  try {
    const pathParts = filePath.split("/");
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    const parts = decodedFileName.split("_");
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      return parts.slice(1).join("_");
    }
    return decodedFileName.substring(decodedFileName.indexOf("_") + 1) || decodedFileName || "Archivo";
  } catch {
    return "Archivo";
  }
};

/**
 * Los adjuntos que vienen del formulario llegan con name y url opcionales,
 * mientras que el envio los exige. Esto descarta los incompletos en lugar de
 * dejar que el tipo mienta.
 */
export const normalizeAttachments = (
  attachments?: Array<{ name?: string; url?: string }> | null
): EmailAttachment[] =>
  (attachments ?? []).filter(
    (adjunto): adjunto is EmailAttachment => Boolean(adjunto?.name && adjunto?.url)
  );

export const buildStorageAttachment = async (
  storagePath: string
): Promise<{ forDialog: EmailAttachment[]; forSend: EmailAttachment[] }> => {
  const fileName = getFileNameFromPath(storagePath);
  const signedUrl = await generateSignedUrl(storagePath);

  const forSend: EmailAttachment[] = [{ name: fileName, url: storagePath }];
  const forDialog: EmailAttachment[] = signedUrl
    ? [{ name: fileName, url: signedUrl }]
    : [];

  return { forDialog, forSend };
};

export const openEmailDialogAfterClose = (
  closeDialog: () => void,
  openEmail: () => void,
  delayMs = 150
) => {
  closeDialog();
  window.setTimeout(openEmail, delayMs);
};
