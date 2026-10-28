import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type CorreoAviso = "none" | "instant" | "daily";

export interface SedeAlerta {
  user_id: string;
  sede_id: string;
  push: boolean;
  correo: CorreoAviso;
}

export const useSedeAlertas = (userId: string | undefined) =>
  useQuery({
    queryKey: ["sede_alertas", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<SedeAlerta[]> => {
      const { data, error } = await supabase
        .from("sede_alertas")
        .select("user_id, sede_id, push, correo")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as SedeAlerta[];
    },
  });

export const useGuardarSedeAlerta = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alerta: SedeAlerta) => {
      const { error } = await supabase.from("sede_alertas").upsert(
        { ...alerta, updated_at: new Date().toISOString() },
        { onConflict: "user_id,sede_id" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sede_alertas"] });
    },
    onError: (error) => {
      toast.error("No se pudo guardar el aviso.", { description: error.message });
    },
  });
};
