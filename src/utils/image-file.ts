const MAX_DIMENSION = 1920;
const MAX_BYTES = 1.5 * 1024 * 1024;
const JPEG_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen."))),
      "image/jpeg",
      quality
    );
  });
}

/** Reduce camera photos so mobile browsers are less likely to reload or crash. */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }
  if (file.size <= 500_000) {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    let { width, height } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = JPEG_QUALITY;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > MAX_BYTES && quality > 0.5) {
      quality -= 0.1;
      blob = await canvasToJpegBlob(canvas, quality);
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "albaran";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export interface PersistedSlipFile {
  name: string;
  type: string;
  dataUrl: string;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo guardar la foto."));
    reader.readAsDataURL(file);
  });
}

export function dataUrlToFile(persisted: PersistedSlipFile): File {
  const [header, base64] = persisted.dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || persisted.type || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], persisted.name, { type: mime, lastModified: Date.now() });
}
