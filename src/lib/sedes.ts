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
    descripcion: "Centro de Investigaciones Biomédicas",
    heroGradient: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 42%, #60a5fa 100%)",
  },
  {
    id: "farmacia",
    name: "Farmacia",
    color: "#9333ea",
    descripcion: "Unidad de Farmacia",
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
  for (const sede of SEDES) {
    if (name.includes(sede.id) || name.includes(sede.name.toLowerCase())) {
      return sede.id;
    }
    if (sede.descripcion && name.includes(sede.descripcion.toLowerCase())) {
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
