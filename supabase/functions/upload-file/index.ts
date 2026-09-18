import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET_NAME = "LabFlow";
const MAX_SIGNED_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_FORMDATA_UPLOAD_BYTES = 4.5 * 1024 * 1024;

const sanitizeFilename = (filename: string) => {
  const base = filename.split(/[/\\]/).pop()?.trim() || filename;
  const cleaned = base.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
  if (cleaned && !cleaned.startsWith(".") && cleaned !== "_" && cleaned !== "-") {
    return cleaned;
  }
  const ext = base.includes(".")
    ? base.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? ""
    : "";
  return ext ? `documento.${ext}` : "documento";
};

const inferContentType = (filename: string, mimeType?: string | null) => {
  const provided = mimeType?.trim().toLowerCase();
  if (
    provided &&
    provided !== "application/octet-stream" &&
    provided !== "binary/octet-stream"
  ) {
    return provided;
  }
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
  return provided || "application/octet-stream";
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface UploadMetadata {
  fileType: string;
  requestId: string;
  poNumber: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number;
}

const parseMetadataFromJson = (body: Record<string, unknown>): UploadMetadata => ({
  fileType: typeof body.fileType === "string" ? body.fileType : "",
  requestId: typeof body.requestId === "string" ? body.requestId : "",
  poNumber: typeof body.poNumber === "string" ? body.poNumber : null,
  fileName: typeof body.fileName === "string" ? body.fileName : null,
  mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
  fileSize: typeof body.fileSize === "number" ? body.fileSize : 0,
});

const validateMetadata = (meta: UploadMetadata, hasFileBytes: boolean) => {
  if (!meta.fileType || !meta.requestId) {
    return "Faltan campos obligatorios: fileType o requestId.";
  }

  const hasNamedFile = Boolean(meta.fileName) || hasFileBytes;
  const hasPoNumber = Boolean(meta.poNumber?.trim());

  if (meta.fileType === "po" && !hasNamedFile && !hasPoNumber) {
    return "Indica un número de PO y/o selecciona un archivo.";
  }

  if (meta.fileType !== "po" && !hasNamedFile) {
    return `El archivo de ${meta.fileType} es obligatorio.`;
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      console.error("Edge Function: Authentication error", authError);
      return jsonResponse({ error: "Unauthorized: Invalid session" }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const contentTypeHeader = req.headers.get("content-type") || "";
    const isMultipart = contentTypeHeader.includes("multipart/form-data");

    let meta: UploadMetadata;
    let fileBytes: Uint8Array | null = null;
    let incomingFileName = "";

    if (isMultipart) {
      const formData = await req.formData();
      const fileEntry = formData.get("file");
      const file = fileEntry instanceof Blob ? fileEntry : null;
      incomingFileName =
        file && "name" in file && typeof (file as File).name === "string"
          ? (file as File).name
          : "";

      meta = {
        fileType: String(formData.get("fileType") || ""),
        requestId: String(formData.get("requestId") || ""),
        poNumber: (formData.get("poNumber") as string | null) || null,
        fileName: incomingFileName || null,
        mimeType: file?.type || null,
        fileSize: file?.size || 0,
      };

      const validationError = validateMetadata(meta, Boolean(file && file.size > 0));
      if (validationError) {
        return jsonResponse({ error: validationError }, 400);
      }

      if (file && file.size > 0) {
        if (file.size > MAX_FORMDATA_UPLOAD_BYTES) {
          return jsonResponse(
            {
              error:
                "El archivo es demasiado grande para esta vía de subida. Prueba de nuevo; los PDF de PO deben ir por URL firmada (hasta 20 MB).",
            },
            413,
          );
        }
        fileBytes = new Uint8Array(await file.arrayBuffer());
        if (fileBytes.byteLength === 0) {
          return jsonResponse({ error: "El archivo está vacío o no se pudo leer." }, 400);
        }
      }
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      meta = parseMetadataFromJson(body);
      const validationError = validateMetadata(meta, false);
      if (validationError) {
        return jsonResponse({ error: validationError }, 400);
      }
      if (meta.fileName && meta.fileSize > MAX_SIGNED_UPLOAD_BYTES) {
        return jsonResponse({ error: "El archivo no puede superar 20 MB." }, 400);
      }
    }

    const trimmedPoNumber = meta.poNumber?.trim() || null;
    const originalName = meta.fileName || incomingFileName || `${meta.fileType}.bin`;
    const sanitizedFileName = sanitizeFilename(originalName);
    const timestampPrefix = Date.now();
    const finalFileName = `${timestampPrefix}_${sanitizedFileName}`;
    const filePath = `${user.id}/${meta.requestId}/${meta.fileType}/${finalFileName}`;
    const resolvedContentType = inferContentType(originalName, meta.mimeType);

    if (fileBytes) {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBytes, {
          cacheControl: "3600",
          upsert: true,
          contentType: resolvedContentType,
        });

      if (uploadError) {
        console.error("Edge Function: Supabase Storage upload error:", uploadError);
        return jsonResponse({ error: uploadError.message }, 500);
      }

      console.log("Edge Function: File uploaded successfully. Path:", filePath);
      return jsonResponse({
        filePath,
        poNumber: trimmedPoNumber,
        needsUpload: false,
      });
    }

    if (meta.fileName) {
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(filePath, { upsert: true });

      if (signError || !signed?.token) {
        console.error("Edge Function: signed upload URL error:", signError);
        return jsonResponse(
          { error: signError?.message || "No se pudo crear la URL de subida." },
          500,
        );
      }

      return jsonResponse({
        filePath: signed.path || filePath,
        poNumber: trimmedPoNumber,
        token: signed.token,
        needsUpload: true,
      });
    }

    return jsonResponse({
      filePath: null,
      poNumber: trimmedPoNumber,
      needsUpload: false,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred in the Edge Function.";
    console.error("Unhandled error in upload-file:", error);
    return jsonResponse({ error: message }, 500);
  }
});
