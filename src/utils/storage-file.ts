const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const REQUEST_FILE_MAX_BYTES = MAX_UPLOAD_BYTES;

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || filename;
  const cleaned = base.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
  if (cleaned && !cleaned.startsWith(".") && cleaned !== "_" && cleaned !== "-") {
    return cleaned;
  }
  const ext = base.includes(".")
    ? base.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? ""
    : "";
  return ext ? `documento.${ext}` : "documento";
}

export function inferContentType(filename: string, mimeType?: string | null): string {
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
}

export function assertRequestFileSize(file: File, maxBytes = MAX_UPLOAD_BYTES): void {
  if (file.size <= 0) {
    throw new Error("El archivo está vacío o no se pudo leer.");
  }
  if (file.size > maxBytes) {
    throw new Error("El archivo no puede superar 20 MB.");
  }
}
