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

export const getSedeById = (id: string | null | undefined): Sede | undefined =>
  id ? SEDES.find((sede) => sede.id === id) : undefined;

export const getSedeLabel = (id: string | null | undefined): string =>
  id ? getSedeById(id)?.name ?? id : "Todas";

/** Resuelve la sede de una dirección: columna sede_id o inferencia por nombre */
export const resolveAddressSedeId = (address: {
  name?: string | null;
  sede_id?: string | null;
}): string | null => {
  if (address.sede_id) return address.sede_id;

  const name = address.name?.toLowerCase() ?? "";
  if (!name) return null;

  // Alias comunes por si el nombre de la dirección no es exactamente el id
  const alias: Record<string, string[]> = {
    cibm: ["cibm", "centro de investigaciones", "biomedic", "biomédic"],
    farmacia: ["farmacia", "farma", "facultad de farmacia", "farbioq"],
  };

  for (const sede of SEDES) {
    const tokens = alias[sede.id] ?? [sede.id, sede.name.toLowerCase()];
    if (tokens.some((token) => name.includes(token))) {
      return sede.id;
    }
  }
  return null;
};

export const filterAddressesBySede = <T extends { name?: string | null; sede_id?: string | null }>(
  addresses: T[] | undefined,
  sedeActiva: string | null | undefined
): T[] => {
  if (!addresses) return [];
  if (!sedeActiva) return addresses;
  return addresses.filter((address) => resolveAddressSedeId(address) === sedeActiva);
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

export const requestMatchesSede = (
  shippingAddressId: string | null | undefined,
  shippingAddresses: { id: string; name?: string | null; sede_id?: string | null }[] | undefined,
  sedeActiva: string | null
): boolean => {
  if (!sedeActiva) return true;
  const address = shippingAddresses?.find((item) => item.id === shippingAddressId);
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
