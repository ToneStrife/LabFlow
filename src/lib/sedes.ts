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
];

export const getSedeById = (id: string | null | undefined): Sede | undefined =>
  id ? SEDES.find((sede) => sede.id === id) : undefined;

export const getSedeLabel = (id: string | null | undefined): string =>
  id ? getSedeById(id)?.name ?? id : "Todas";
