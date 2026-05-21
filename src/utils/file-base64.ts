const MAX_PDF_BYTES = 4 * 1024 * 1024;

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

export function assertPdfWithinSizeLimit(file: File, maxBytes = MAX_PDF_BYTES): void {
  if (file.type !== "application/pdf") {
    throw new Error("Solo se admiten archivos PDF.");
  }
  if (file.size > maxBytes) {
    throw new Error("El PDF no puede superar 4 MB para la extracción con IA.");
  }
}

export const PDF_PARSE_MAX_BYTES = MAX_PDF_BYTES;
