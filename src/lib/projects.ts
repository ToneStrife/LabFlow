import type { Project } from "@/data/types";

/** Fecha local YYYY-MM-DD para comparar con columnas date de Postgres. */
function hoyIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Proyecto usable en pedidos nuevos: activo y dentro de su vigencia
 * (fecha_inicio / fecha_fin opcionales).
 */
export function proyectoVigente(
  project: Pick<Project, "activo" | "fecha_inicio" | "fecha_fin">
): boolean {
  if (project.activo === false) return false;
  const hoy = hoyIsoLocal();
  if (project.fecha_inicio && project.fecha_inicio > hoy) return false;
  if (project.fecha_fin && project.fecha_fin < hoy) return false;
  return true;
}
