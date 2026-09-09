export interface Sede {
  id: string;
  name: string;
  /** Color de acento para puntos y badges en la UI */
  color: string;
}

/** Valor del selector cuando el usuario puede ver todas las sedes */
export const TODAS_LAS_SEDES = "all";

export const SEDES: Sede[] = [
  { id: "cibm", name: "CIBM", color: "#2563eb" },
  { id: "farmacia", name: "Farmacia", color: "#059669" },
];

export const getSedeById = (id: string | null | undefined): Sede | undefined =>
  id ? SEDES.find((sede) => sede.id === id) : undefined;

export const getSedeLabel = (id: string | null | undefined): string =>
  id ? getSedeById(id)?.name ?? id : "Todas";

export const filterAddressesBySede = <T extends { sede_id?: string | null }>(
  addresses: T[] | undefined,
  sedeActiva: string | null | undefined
): T[] => {
  if (!addresses) return [];
  if (!sedeActiva) return addresses;
  return addresses.filter((address) => !address.sede_id || address.sede_id === sedeActiva);
};

export const requestMatchesSede = (
  shippingAddressId: string | null | undefined,
  shippingAddresses: { id: string; sede_id?: string | null }[] | undefined,
  sedeActiva: string | null
): boolean => {
  if (!sedeActiva) return true;
  const address = shippingAddresses?.find((item) => item.id === shippingAddressId);
  if (!address) return true;
  return !address.sede_id || address.sede_id === sedeActiva;
};
