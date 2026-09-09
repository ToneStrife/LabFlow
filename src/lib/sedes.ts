import { sedeAssetUrl } from "@/lib/sede-theme";

export interface Sede {
  id: string;
  name: string;
  /** Color de acento para puntos y badges en la UI */
  color: string;
  /** Descripción corta de la sede (ubicación/unidad) */
  descripcion?: string;
  /** Foto de fondo opcional para el banner */
  heroImageUrl?: string;
  /** Gradiente CSS de respaldo si no hay foto */
  heroGradient: string;
}

/** Logo e identidad del grupo de investigación (compartido por todas las sedes) */
export const GRUPO = {
  nombre: "FarBioQ",
  descripcion: "Farmacología y Bioquímica de Enfermedades Inmunomediadas",
  logoUrl: sedeAssetUrl("sedes/farbioq-logo.png"),
};

/** Valor del selector cuando el usuario puede ver todas las sedes */
export const TODAS_LAS_SEDES = "all";

export const SEDES: Sede[] = [
  {
    id: "cibm",
    name: "CIBM",
    color: "#2563eb",
    descripcion: "Centro de Investigación Biomédica · Universidad de Granada",
    heroImageUrl: sedeAssetUrl("sedes/cibm-hero.jpg"),
    heroGradient: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 42%, #60a5fa 100%)",
  },
  {
    id: "farmacia",
    name: "Farmacia",
    color: "#9333ea",
    descripcion: "Facultad de Farmacia · Universidad de Granada",
    heroImageUrl: sedeAssetUrl("sedes/farmacia-hero.jpg"),
    heroGradient:
      "linear-gradient(135deg, #581c87 0%, #9333ea 38%, #a855f7 62%, #c4b5fd 100%)",
  },
];

export const isValidSedeId = (id: string | null | undefined): id is string =>
  !!id && SEDES.some((sede) => sede.id === id);

export const getSedeById = (id: string | null | undefined): Sede | undefined =>
  id ? SEDES.find((sede) => sede.id === id) : undefined;

export const getSedeLabel = (id: string | null | undefined): string =>
  id ? getSedeById(id)?.name ?? id : "Todas";

/** Solo sede_id explícito; la inferencia por nombre es solo ayuda visual en Admin */
export const resolveAddressSedeId = (address: {
  name?: string | null;
  sede_id?: string | null;
}): string | null => {
  if (address.sede_id && isValidSedeId(address.sede_id)) return address.sede_id;
  return null;
};

/** Inferencia suave por nombre (solo UI, no para filtrar listados) */
export const inferSedeIdFromName = (name: string | null | undefined): string | null => {
  const normalized = name?.toLowerCase() ?? "";
  if (!normalized) return null;

  const alias: Record<string, string[]> = {
    cibm: ["cibm", "centro de investigación biomédica", "centro de investigacion biomedica"],
    farmacia: ["facultad de farmacia", "farmacia"],
  };

  for (const sede of SEDES) {
    const tokens = alias[sede.id] ?? [sede.id, sede.name.toLowerCase()];
    if (tokens.some((token) => normalized.includes(token))) {
      return sede.id;
    }
  }
  return null;
};

/** Dirección de envío por defecto de la sede; si no hay, la primera disponible */
export const getDefaultShippingAddressId = <T extends { id: string; name?: string | null; sede_id?: string | null }>(
  addresses: T[] | undefined,
  sedeActiva: string | null | undefined
): string => {
  if (!addresses?.length) return "";
  if (!sedeActiva) return addresses[0].id;
  const deLaSede = addresses.find((address) => resolveAddressSedeId(address) === sedeActiva);
  return deLaSede?.id ?? addresses[0].id;
};

export const formatShippingAddressLabel = (address: {
  name: string;
  sede_id?: string | null;
}): string => {
  const sede = getSedeById(resolveAddressSedeId(address));
  return sede ? `${address.name} · ${sede.name}` : address.name;
};

export const requestMatchesSede = (
  shippingAddressId: string | null | undefined,
  shippingAddresses: { id: string; name?: string | null; sede_id?: string | null }[] | undefined,
  sedeActiva: string | null
): boolean => {
  if (!sedeActiva) return true;
  // Sin lista de direcciones aún: no excluir (evita vaciar listados al cargar)
  if (!shippingAddresses) return true;
  const address = shippingAddresses.find((item) => item.id === shippingAddressId);
  if (!address) return false;
  return resolveAddressSedeId(address) === sedeActiva;
};

export const filterRequestsBySede = <T extends { shipping_address_id?: string | null }>(
  requests: T[] | undefined,
  shippingAddresses: { id: string; name?: string | null; sede_id?: string | null }[] | undefined,
  sedeActiva: string | null
): T[] => {
  if (!requests) return [];
  if (!sedeActiva) return requests;
  return requests.filter((request) =>
    requestMatchesSede(request.shipping_address_id, shippingAddresses, sedeActiva)
  );
};
