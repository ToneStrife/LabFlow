const MAX_PARSE_BYTES = 4 * 1024 * 1024;

const PDF_MIME = "application/pdf";
const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isQuoteParseMime(mimeType: string | null | undefined): boolean {
  const mime = (mimeType || "").toLowerCase().trim();
  return mime === PDF_MIME || IMAGE_MIMES.has(mime);
}

export function normalizeQuoteParseMime(file: File): string {
  const mime = (file.type || "").toLowerCase().trim();
  if (mime === "image/jpg") return "image/jpeg";
  if (isQuoteParseMime(mime)) return mime;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return PDF_MIME;
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return mime || "application/octet-stream";
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

export function assertQuoteFileWithinParseLimit(
  file: File,
  maxBytes = MAX_PARSE_BYTES
): void {
  const mime = normalizeQuoteParseMime(file);
  if (!isQuoteParseMime(mime)) {
    throw new Error(
      "Para la extracción con IA usa un PDF o una imagen (JPG, PNG, WEBP)."
    );
  }
  if (file.size > maxBytes) {
    throw new Error(
      "El archivo no puede superar 4 MB para la extracción con IA. Prueba a comprimir la captura."
    );
  }
}

/** @deprecated Usar assertQuoteFileWithinParseLimit */
export function assertPdfWithinSizeLimit(file: File, maxBytes = MAX_PARSE_BYTES): void {
  assertQuoteFileWithinParseLimit(file, maxBytes);
}

export const PDF_PARSE_MAX_BYTES = MAX_PARSE_BYTES;
export const QUOTE_PARSE_MAX_BYTES = MAX_PARSE_BYTES;
