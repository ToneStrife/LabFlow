import { inferSedeIdFromName, resolveAddressSedeId, sedeEsFarmacia, getSedeById } from "@/lib/sedes";
import type { LabMember, Profile } from "@/data/types";

export const SEDE_FARMACIA = "farmacia";

/** Remitente SMTP histórico de Niceto (seed); el From real sale del gestor del lab. */
export const CORREO_NICETO = "niceto@go.ugr.es";

type DireccionSede = {
  id: string;
  name?: string | null;
  sede_id?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
};

type Persona = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export type CorreoGestorLab = {
  to: string;
  from: string;
  fromName: string;
  error?: string;
};

/** @deprecated Usar CorreoGestorLab */
export type CorreoNiceto = CorreoGestorLab;

function textoEsFarmacia(texto: string | null | undefined): boolean {
  const normalizado = texto?.toLowerCase() ?? "";
  if (!normalizado) return false;
  if (inferSedeIdFromName(normalizado)) {
    const sede = getSedeById(inferSedeIdFromName(normalizado));
    if (sedeEsFarmacia(sede)) return true;
  }
  return /\bfarma\b/.test(normalizado) || normalizado.includes("farmacia");
}

/** Un pedido es de Farmacia si la sede (o la dirección) es tipo farmacia. */
export function esPedidoFarmacia(
  shippingAddressId: string | null | undefined,
  addresses: DireccionSede[] | undefined,
  requestSedeId?: string | null
): boolean {
  if (requestSedeId) {
    const sede = getSedeById(requestSedeId);
    if (sedeEsFarmacia(sede)) return true;
  }
  if (!shippingAddressId || !addresses?.length) return false;
  const address = addresses.find((item) => item.id === shippingAddressId);
  if (!address) return false;
  const sedeId = resolveAddressSedeId(address);
  if (sedeId && sedeEsFarmacia(getSedeById(sedeId))) return true;
  return [address.name, address.address_line_1, address.address_line_2, address.city].some(textoEsFarmacia);
}

/** @deprecated Usar isLabOrderManager */
export function esNiceto(persona: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): boolean {
  const email = (persona.email ?? "").trim().toLowerCase();
  if (email === CORREO_NICETO || email === "niceto@ugr.es") return true;
  return `${persona.first_name ?? ""} ${persona.last_name ?? ""}`.toLowerCase().includes("niceto");
}

export function isLabOrderManager(
  userId: string | null | undefined,
  memberships: LabMember[] | undefined,
  labId?: string | null
): boolean {
  if (!userId || !memberships?.length) return false;
  return memberships.some(
    (m) =>
      m.user_id === userId &&
      m.role === "lab_order_manager" &&
      (!labId || m.lab_id === labId)
  );
}

export function labOrderManagerForLab(
  memberships: LabMember[] | undefined,
  labId: string | null | undefined,
  profiles?: Profile[] | undefined
): { member: LabMember; profile?: Profile } | null {
  if (!labId || !memberships?.length) return null;
  const member = memberships.find((m) => m.lab_id === labId && m.role === "lab_order_manager");
  if (!member) return null;
  const profile = profiles?.find((p) => p.id === member.user_id);
  return { member, profile };
}

/**
 * Prefill De cuando un gestor de pedidos del lab actúa (o es el solicitante gestor).
 * Sustituye la heurística Niceto por nombre/email.
 */
export function correoSiGestorLab(opts: {
  shippingAddressId: string | null | undefined;
  addresses: DireccionSede[] | undefined;
  requesterId: string | null | undefined;
  actorId: string | null | undefined;
  labId?: string | null;
  requestSedeId?: string | null;
  memberships?: LabMember[] | undefined;
  personas?: Persona[] | undefined;
}): CorreoGestorLab | null {
  if (!esPedidoFarmacia(opts.shippingAddressId, opts.addresses, opts.requestSedeId)) {
    return null;
  }

  const labId = opts.labId ?? null;
  const actorId = opts.actorId ?? null;
  const requesterId = opts.requesterId ?? null;

  const gestores = (opts.memberships ?? []).filter(
    (m) => m.role === "lab_order_manager" && (!labId || m.lab_id === labId)
  );
  if (!gestores.length) {
    // Puente temporal: si aún no hay membresías cargadas, mantener Niceto histórico.
    const niceto = opts.personas?.find(esNiceto);
    if (!niceto) return null;
    const loHaceEl = requesterId === niceto.id || actorId === niceto.id;
    if (!loHaceEl) return null;
    const fromName = `${niceto.first_name ?? ""} ${niceto.last_name ?? ""}`.trim() || "Niceto";
    return { to: "", from: CORREO_NICETO, fromName };
  }

  const gestor =
    gestores.find((m) => m.user_id === actorId) ||
    gestores.find((m) => m.user_id === requesterId) ||
    gestores[0];

  const loHaceEl = gestor.user_id === actorId || gestor.user_id === requesterId;
  if (!loHaceEl && actorId && !gestores.some((m) => m.user_id === actorId)) {
    return null;
  }

  const persona = opts.personas?.find((p) => p.id === gestor.user_id);
  const fromName =
    `${persona?.first_name ?? ""} ${persona?.last_name ?? ""}`.trim() ||
    persona?.email ||
    "Gestor";
  const from = (gestor.smtp_from || persona?.email || CORREO_NICETO).trim();

  return { to: "", from, fromName };
}

/** @deprecated Usar correoSiGestorLab */
export function correoSiLoHaceNiceto(opts: {
  shippingAddressId: string | null | undefined;
  addresses: DireccionSede[] | undefined;
  requesterId: string | null | undefined;
  actorId: string | null | undefined;
  personas: Persona[] | undefined;
  labId?: string | null;
  requestSedeId?: string | null;
  memberships?: LabMember[] | undefined;
}): CorreoGestorLab | null {
  return correoSiGestorLab(opts);
}

/** Prefill De/nombre cuando aplica gestor; el Para lo pone el llamador. */
export function camposCorreoConNiceto(
  especial: CorreoGestorLab | null | undefined,
  toPorDefecto: string
): { to: string; from?: string; fromName?: string } {
  if (!especial || especial.error) return { to: toPorDefecto };
  return { to: toPorDefecto, from: especial.from, fromName: especial.fromName };
}

export function camposCorreoConGestor(
  especial: CorreoGestorLab | null | undefined,
  toPorDefecto: string
): { to: string; from?: string; fromName?: string } {
  return camposCorreoConNiceto(especial, toPorDefecto);
}
