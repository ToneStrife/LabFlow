import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ParseQuotePdfResponse } from "@/data/quote-parse";
import { assertPdfWithinSizeLimit, fileToBase64 } from "@/utils/file-base64";

export const useParseQuotePdf = () => {
  return useMutation<ParseQuotePdfResponse, Error, File>({
    mutationFn: async (file: File) => {
      assertPdfWithinSizeLimit(file);
      const pdfBase64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("parse-quote-pdf", {
        method: "POST",
        body: { pdfBase64, mimeType: "application/pdf" },
      });

      if (error) {
        console.error("Error invoking parse-quote-pdf:", error);
        throw new Error(error.message);
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
      toast.error("No se pudo extraer productos del PDF.", {
        description: error.message,
      });
    },
  });
};
