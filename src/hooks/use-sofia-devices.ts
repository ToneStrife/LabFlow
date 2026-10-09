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
  // escucha y horarios (null = lo que traiga la placa)
  wake_umbral: number | null;
  voz_minima: number | null;
  fin_frase_ms: number | null;
  seguir_ms: number | null;
  cierre_hora: number | null;
  silencio_min: number | null;
  // versión de las opciones y lo que ha contado la placa al aplicarlas
  config_rev: number;
  applied_rev: number | null;
  estado: {
    avisos?: string[];
    aplicado_at?: string;
    clave_gemini?: string;
    red?: string;
    /** valores propios de la placa (secrets.h), lo que vale cuando aquí se deja «de la placa» */
    placa?: { umbral?: number; voz_minima?: number; fin_frase_ms?: number; seguir_ms?: number; cierre_hora?: number; silencio_min?: number };
  } | null;
}

/** Lo que cada persona puede cambiar de su Sofía */
export type SofiaDeviceOpciones = Pick<
  SofiaDevice,
  | "nombre"
  | "propietario"
  | "avatar"
  | "voz"
  | "volumen"
  | "protocolos_carpeta"
  | "sede_id"
  | "wake_umbral"
  | "voz_minima"
  | "fin_frase_ms"
  | "seguir_ms"
  | "cierre_hora"
  | "silencio_min"
>;

const KEY = ["sofia-devices"];

export const useMySofiaDevices = () => {
  const { session } = useSession();
  const uid = session?.user?.id;
  return useQuery<SofiaDevice[], Error>({
    queryKey: [...KEY, uid],
    enabled: !!uid,
    refetchInterval: 20000,   // para ver cuándo la placa aplica los cambios
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

/** Claves de una Sofía: la página solo sabe si hay clave de Gemini y los nombres de las redes, nunca las contraseñas */
export interface SofiaSecretInfo {
  gemini: boolean;
  gemini_fin: string | null;
  wifi: string[];
}

export const useSofiaSecretInfo = (deviceId: string) =>
  useQuery<SofiaSecretInfo, Error>({
    queryKey: [...KEY, "claves", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("sofia_secret_info", { p_device: deviceId });
      if (error) throw new Error(error.message);
      return data as SofiaSecretInfo;
    },
  });

export const useSetSofiaSecrets = () => {
  const qc = useQueryClient();
  return useMutation<
    SofiaSecretInfo,
    Error,
    { deviceId: string; gemini?: string | null; wifi?: { ssid: string; pass?: string }[] | null }
  >({
    mutationFn: async ({ deviceId, gemini, wifi }) => {
      const { data, error } = await supabase.rpc("sofia_set_secrets", {
        p_device: deviceId,
        p_gemini: gemini ?? null,
        p_wifi: wifi ?? null,
      });
      if (error) throw new Error(error.message);
      return data as SofiaSecretInfo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Guardado", { description: "La placa lo coge en unos minutos o al decirle «actualiza la configuración»." });
    },
    onError: (e) => toast.error("No se pudo guardar", { description: e.message }),
  });
};
