import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ParseQuotePdfResponse } from "@/data/quote-parse";
import {
  assertQuoteFileWithinParseLimit,
  fileToBase64,
  normalizeQuoteParseMime,
} from "@/utils/file-base64";
import { compressImageFile } from "@/utils/image-file";

async function extractFunctionError(
  error: { message?: string; context?: unknown },
  data: unknown
): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  const ctx = error.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* ignore */
    }
  }
  return error.message || "No se pudieron leer los productos del presupuesto.";
}

export const useParseQuotePdf = () => {
  return useMutation<ParseQuotePdfResponse, Error, File>({
    mutationFn: async (file: File) => {
      // Las capturas grandes se reducen antes de enviar a Gemini.
      const prepared =
        file.type.startsWith("image/") ? await compressImageFile(file) : file;
      assertQuoteFileWithinParseLimit(prepared);
      const mimeType = normalizeQuoteParseMime(prepared);
      const fileBase64 = await fileToBase64(prepared);

      const { data, error } = await supabase.functions.invoke("parse-quote-pdf", {
        method: "POST",
        body: {
          // Compatibilidad con la función antigua (pdfBase64) y la nueva (fileBase64).
          pdfBase64: fileBase64,
          fileBase64,
          mimeType,
        },
      });

      if (error) {
        console.error("Error invoking parse-quote-pdf:", error, data);
        throw new Error(await extractFunctionError(error, data));
      }

      const result = data as ParseQuotePdfResponse & { error?: string };
      if (result?.error) {
        throw new Error(result.error);
      }

      if (!result?.items || !Array.isArray(result.items)) {
        throw new Error("Respuesta inválida del servidor.");
      }

      return { items: result.items };
    },
    onError: (error) => {
      toast.error("No se pudieron leer los productos del presupuesto.", {
        description: error.message,
      });
    },
  });
};
