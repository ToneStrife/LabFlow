import { sedeAssetUrl } from "@/lib/sede-theme";
import type { SedeRecord, SedeTipo } from "@/data/types";

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
  tipo?: SedeTipo;
  lab_id?: string;
}

/** Logo e identidad por defecto (FarBioQ) hasta cargar labs desde BD */
export const GRUPO = {
  nombre: "FarBioQ",
  descripcion: "Farmacología y Bioquímica de Enfermedades Inmunomediadas",
  logoUrl: sedeAssetUrl("sedes/farbioq-logo.png"),
};

/** Valor del selector cuando el usuario puede ver todas las sedes */
export const TODAS_LAS_SEDES = "all";

/** Catálogo semilla FarBioQ (fallback si la BD aún no responde). */
export const SEDES_FALLBACK: Sede[] = [
  {
    id: "cibm",
    name: "CIBM",
    color: "#2563eb",
    descripcion: "Centro de Investigación Biomédica · Universidad de Granada",
    heroImageUrl: sedeAssetUrl("sedes/cibm-hero.jpg"),
    heroGradient: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 42%, #60a5fa 100%)",
    tipo: "cibm",
  },
  {
    id: "farmacia",
    name: "Farmacia",
    color: "#9333ea",
    descripcion: "Facultad de Farmacia · Universidad de Granada",
    heroImageUrl: sedeAssetUrl("sedes/farmacia-hero.jpg"),
    heroGradient:
      "linear-gradient(135deg, #581c87 0%, #9333ea 38%, #a855f7 62%, #c4b5fd 100%)",
    tipo: "farmacia",
  },
];

/** @deprecated Preferir catálogo dinámico vía useSedesCatalog */
export const SEDES = SEDES_FALLBACK;

const urlDeFondo = (valor: string | null | undefined, sedeId: string): string | undefined => {
  if (!valor) return SEDES_FALLBACK.find((sede) => sede.id === sedeId)?.heroImageUrl;
  if (valor.startsWith("http")) return valor;
  return sedeAssetUrl(valor);
};

export const sedeFromRecord = (row: SedeRecord): Sede => ({
  id: row.id,
  name: row.name,
  color: row.color,
  descripcion: row.descripcion ?? undefined,
  heroImageUrl: urlDeFondo(row.hero_image_url, row.id),
  heroGradient: row.hero_gradient,
  tipo: row.tipo,
  lab_id: row.lab_id,
});

let catalogoActual: Sede[] = SEDES_FALLBACK;

export const setSedesCatalog = (sedes: Sede[]) => {
  catalogoActual = sedes.length ? sedes : SEDES_FALLBACK;
};

export const getSedesCatalog = (): Sede[] => catalogoActual;

export const isValidSedeId = (id: string | null | undefined): id is string =>
  !!id && getSedesCatalog().some((sede) => sede.id === id);

export const getSedeById = (id: string | null | undefined): Sede | undefined =>
  id ? getSedesCatalog().find((sede) => sede.id === id) : undefined;

export const getSedeLabel = (id: string | null | undefined): string =>
  id ? getSedeById(id)?.name ?? id : "Todas";

export const sedeEsFarmacia = (sede: Pick<Sede, "id" | "tipo"> | null | undefined): boolean => {
  if (!sede) return false;
  if (sede.tipo === "farmacia") return true;
  return sede.id === "farmacia" || sede.id.endsWith("-farmacia");
};

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

  for (const sede of getSedesCatalog()) {
    if (sede.tipo === "farmacia" && (normalized.includes("farmacia") || /\bfarma\b/.test(normalized))) {
      return sede.id;
    }
    if (sede.tipo === "cibm" && normalized.includes("cibm")) return sede.id;
    if (normalized.includes(sede.name.toLowerCase()) || normalized.includes(sede.id)) {
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
  sedeActiva: string | null,
  requestSedeId?: string | null
): boolean => {
  if (!sedeActiva) return true;
  if (requestSedeId) return requestSedeId === sedeActiva;
  if (!shippingAddresses) return true;
  const address = shippingAddresses.find((item) => item.id === shippingAddressId);
  if (!address) return false;
  return resolveAddressSedeId(address) === sedeActiva;
};

export const filterRequestsBySede = <
  T extends { shipping_address_id?: string | null; sede_id?: string | null },
>(
  requests: T[] | undefined,
  shippingAddresses: { id: string; name?: string | null; sede_id?: string | null }[] | undefined,
  sedeActiva: string | null
): T[] => {
  if (!requests) return [];
  if (!sedeActiva) return requests;
  return requests.filter((request) =>
    requestMatchesSede(request.shipping_address_id, shippingAddresses, sedeActiva, request.sede_id)
  );
};
