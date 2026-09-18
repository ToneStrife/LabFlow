import { supabase } from "@/lib/supabase";
import {
  assertRequestFileSize,
  inferContentType,
  sanitizeFilename,
} from "@/utils/storage-file";

const BUCKET_NAME = "LabFlow";

export type UploadableFileType = "quote" | "po" | "slip" | "invoice";

export interface UploadRequestFileResult {
  filePath: string | null;
  poNumber: string | null;
}

interface UploadRequestFileOptions {
  requestId: string;
  fileType: UploadableFileType;
  file?: File | null;
  poNumber?: string | null;
}

interface SignUploadResponse {
  filePath: string | null;
  poNumber: string | null;
  token?: string | null;
  needsUpload?: boolean;
  error?: string;
}

async function extractFunctionError(
  error: { message?: string; context?: unknown },
  data: unknown,
  fallback: string
): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      // La respuesta no era JSON.
    }
  }

  return error.message || fallback;
}

async function invokeUploadFile(body: FormData | Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("upload-file", {
    body,
    method: "POST",
  });

  if (error) {
    throw new Error(
      await extractFunctionError(error, data, "Fallo al subir el archivo.")
    );
  }

  const payload = data as SignUploadResponse | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }
  if (!payload) {
    throw new Error("La función de subida no devolvió datos.");
  }
  return payload;
}

async function uploadWithSignedUrl(
  options: UploadRequestFileOptions
): Promise<UploadRequestFileResult> {
  const mimeType = options.file
    ? inferContentType(options.file.name, options.file.type)
    : null;

  const payload = await invokeUploadFile({
    fileType: options.fileType,
    requestId: options.requestId,
    poNumber: options.poNumber ?? null,
    fileName: options.file ? sanitizeFilename(options.file.name) : null,
    mimeType,
    fileSize: options.file?.size ?? 0,
  });

  if (options.file && payload.needsUpload && payload.token && payload.filePath) {
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .uploadToSignedUrl(payload.filePath, payload.token, options.file, {
        contentType: mimeType ?? inferContentType(options.file.name, options.file.type),
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
  } else if (options.file && payload.needsUpload) {
    throw new Error("No se pudo preparar la subida firmada del archivo.");
  }

  return {
    filePath: payload.filePath ?? null,
    poNumber: payload.poNumber ?? null,
  };
}

async function uploadWithFormData(
  options: UploadRequestFileOptions
): Promise<UploadRequestFileResult> {
  const formData = new FormData();
  if (options.file) {
    const contentType = inferContentType(options.file.name, options.file.type);
    const namedFile =
      options.file.type === contentType
        ? options.file
        : new File([options.file], options.file.name, { type: contentType });
    formData.append("file", namedFile);
  }
  formData.append("fileType", options.fileType);
  formData.append("requestId", options.requestId);
  if (options.poNumber) {
    formData.append("poNumber", options.poNumber);
  }

  const payload = await invokeUploadFile(formData);
  return {
    filePath: payload.filePath ?? null,
    poNumber: payload.poNumber ?? null,
  };
}

/**
 * Sube un adjunto de solicitud (cotización, PO, albarán o factura).
 * Primero pide una URL firmada para no meter el PDF por la Edge Function
 * (ahí se corrompían o fallaban). Si eso no está disponible, usa FormData.
 */
export async function uploadRequestFile(
  options: UploadRequestFileOptions
): Promise<UploadRequestFileResult> {
  const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError || !sessionData.session) {
    throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión e inténtalo de nuevo.");
  }

  if (options.file) {
    assertRequestFileSize(options.file);
  }

  try {
    return await uploadWithSignedUrl(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const tooLargeForFormData = Boolean(options.file && options.file.size > 4.5 * 1024 * 1024);
    const isClientValidation = /obligatorio|número de PO|sesión ha caducado|vacío|20 MB/i.test(
      message
    );
    if (tooLargeForFormData || isClientValidation) {
      throw error;
    }
    console.warn("Signed upload failed, falling back to FormData:", error);
    return await uploadWithFormData(options);
  }
}
