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
  ota_modo: "auto" | "fija" | "no";
  ota_firmware: string | null;
  firmware_md5: string | null;
  config_rev: number;
  applied_rev: number | null;
  estado: {
    avisos?: string[];
    aplicado_at?: string;
    clave_gemini?: string;
    red?: string;
    md5?: string;
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

// ------------------------------------------------------------------ firmware (actualizaciones desde LabFlow)
export interface SofiaFirmware {
  id: string;
  created_at: string;
  version: string;
  notas: string | null;
  path: string;
  size: number;
  md5: string;
  publicado: boolean;
  publicado_at: string | null;
}

const FW_KEY = ["sofia-firmware"];
const FW_BUCKET = "sofia-firmware";

export const useSofiaFirmware = (enabled = true) =>
  useQuery<SofiaFirmware[], Error>({
    queryKey: FW_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("sofia_firmware").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as SofiaFirmware[];
    },
  });

/** MD5 del archivo, igual al que calcula la placa de su propio programa */
const md5DeArchivo = async (file: File): Promise<string> => {
  const SparkMD5 = (await import("spark-md5")).default;
  const spark = new SparkMD5.ArrayBuffer();
  const trozo = 1024 * 1024;
  for (let i = 0; i < file.size; i += trozo) spark.append(await file.slice(i, i + trozo).arrayBuffer());
  return spark.end();
};

export const useUploadSofiaFirmware = () => {
  const qc = useQueryClient();
  return useMutation<SofiaFirmware, Error, { file: File; version: string; notas: string; publicar: boolean }>({
    mutationFn: async ({ file, version, notas, publicar }) => {
      if (!file.name.toLowerCase().endsWith(".bin")) throw new Error("Tiene que ser el .bin exportado desde el Arduino IDE.");
      if (file.size < 100000 || file.size > 4 * 1024 * 1024) throw new Error("Ese archivo no parece el programa de Sofía (tamaño raro).");
      const cabecera = new Uint8Array(await file.slice(0, 1).arrayBuffer());
      if (cabecera[0] !== 0xe9) throw new Error("Ese .bin no es un programa de ESP32 (¿es el .bootloader o el .merged?). Usa el que acaba en .ino.bin.");
      const md5 = await md5DeArchivo(file);
      const path = `${new Date().toISOString().slice(0, 10)}/${md5}.bin`;
      const { error: errSubida } = await supabase.storage
        .from(FW_BUCKET)
        .upload(path, file, { contentType: "application/octet-stream", upsert: true });
      if (errSubida) throw new Error(errSubida.message);
      const { data, error } = await supabase
        .from("sofia_firmware")
        .insert({ version: version.trim(), notas: notas.trim() || null, path, size: file.size, md5, publicado: publicar })
        .select()
        .single();
      if (error) {
        await supabase.storage.from(FW_BUCKET).remove([path]);
        throw new Error(error.message.includes("md5") ? "Esa versión ya está subida (mismo archivo)." : error.message);
      }
      return data as SofiaFirmware;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: FW_KEY });
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Versión ${f.version} subida`, {
        description: f.publicado ? "Las Sofías en automático se actualizarán cuando estén libres." : "Sin publicar: puedes probarla primero en una sola placa.",
      });
    },
    onError: (e) => toast.error("No se pudo subir", { description: e.message }),
  });
};

export const usePublishSofiaFirmware = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; publicado: boolean }>({
    mutationFn: async ({ id, publicado }) => {
      const { error } = await supabase.from("sofia_firmware").update({ publicado }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: FW_KEY });
      toast.success(v.publicado ? "Versión publicada" : "Versión retirada");
    },
    onError: (e) => toast.error("No se pudo cambiar", { description: e.message }),
  });
};

export const useDeleteSofiaFirmware = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, SofiaFirmware>({
    mutationFn: async (f) => {
      const { error } = await supabase.from("sofia_firmware").delete().eq("id", f.id);
      if (error) throw new Error(error.message);
      await supabase.storage.from(FW_BUCKET).remove([f.path]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FW_KEY });
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Versión borrada");
    },
    onError: (e) => toast.error("No se pudo borrar", { description: e.message }),
  });
};

export const useSetSofiaOta = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; ota_modo: "auto" | "fija" | "no"; ota_firmware: string | null }>({
    mutationFn: async ({ id, ota_modo, ota_firmware }) => {
      const { error } = await supabase.from("sofia_devices").update({ ota_modo, ota_firmware }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Guardado", { description: "La placa lo mira en unos minutos y se actualiza cuando esté libre." });
    },
    onError: (e) => toast.error("No se pudo guardar", { description: e.message }),
  });
};
