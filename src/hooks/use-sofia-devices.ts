import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/components/SessionContextProvider";

/** Un asistente Sofía (la placa de voz del laboratorio) registrado a nombre de alguien */
export interface SofiaDevice {
  id: string;
  created_at: string;
  owner_id: string;
  hw_id: string;
  nombre: string;
  propietario: string | null;
  avatar: number;
  voz: string;
  volumen: number;
  protocolos_carpeta: string;
  sede_id: string | null;
  last_seen_at: string | null;
  firmware: string | null;
}

/** Lo que cada persona puede cambiar de su Sofía */
export type SofiaDeviceOpciones = Pick<
  SofiaDevice,
  "nombre" | "propietario" | "avatar" | "voz" | "volumen" | "protocolos_carpeta" | "sede_id"
>;

const KEY = ["sofia-devices"];

export const useMySofiaDevices = () => {
  const { session } = useSession();
  const uid = session?.user?.id;
  return useQuery<SofiaDevice[], Error>({
    queryKey: [...KEY, uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sofia_devices")
        .select("*")
        .eq("owner_id", uid!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as SofiaDevice[];
    },
  });
};

/** Las Sofías de los demás (solo para administración: la política solo se las deja leer a quien administra) */
export interface SofiaDeviceAjena extends SofiaDevice {
  owner: { first_name: string | null; last_name: string | null } | null;
}

export const useOtherSofiaDevices = (enabled: boolean) => {
  const { session } = useSession();
  const uid = session?.user?.id;
  return useQuery<SofiaDeviceAjena[], Error>({
    queryKey: [...KEY, "otras", uid],
    enabled: enabled && !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sofia_devices")
        .select("*, owner:profiles(first_name, last_name)")
        .neq("owner_id", uid!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as SofiaDeviceAjena[];
    },
  });
};

export const usePairSofia = () => {
  const qc = useQueryClient();
  return useMutation<string, Error, string>({
    mutationFn: async (code) => {
      const { data, error } = await supabase.rpc("sofia_pair_claim", { p_code: code });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Sofía emparejada", {
        description: "En unos segundos la placa lo confirmará en su pantalla.",
      });
    },
    onError: (e) => toast.error("No se pudo emparejar", { description: e.message }),
  });
};

export const useUpdateSofia = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; data: SofiaDeviceOpciones }>({
    mutationFn: async ({ id, data }) => {
      const { error } = await supabase.from("sofia_devices").update(data).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Cambios guardados", {
        description: "La placa los coge al reiniciar o si le dices «actualiza la configuración».",
      });
    },
    onError: (e) => toast.error("No se pudieron guardar los cambios", { description: e.message }),
  });
};

export const useRemoveSofia = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from("sofia_devices").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Sofía desvinculada");
    },
    onError: (e) => toast.error("No se pudo desvincular", { description: e.message }),
  });
};
