import { inferSedeIdFromName, resolveAddressSedeId } from "@/lib/sedes";

export const SEDE_FARMACIA = "farmacia";

/** Remitente y buzón de Niceto en pedidos de Farmacia. */
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

export type CorreoNiceto = {
  to: string;
  from: string;
  fromName: string;
  error?: string;
};

function textoEsFarmacia(texto: string | null | undefined): boolean {
  const normalizado = texto?.toLowerCase() ?? "";
  if (!normalizado) return false;
  if (inferSedeIdFromName(normalizado) === SEDE_FARMACIA) return true;
  return /\bfarma\b/.test(normalizado);
}

/** Un pedido es de Farmacia si el envío es de esa sede, o si la dirección lo dice. */
export function esPedidoFarmacia(
  shippingAddressId: string | null | undefined,
  addresses: DireccionSede[] | undefined
): boolean {
  if (!shippingAddressId || !addresses?.length) return false;
  const address = addresses.find((item) => item.id === shippingAddressId);
  if (!address) return false;
  if (resolveAddressSedeId(address) === SEDE_FARMACIA) return true;
  return [address.name, address.address_line_1, address.address_line_2, address.city].some(textoEsFarmacia);
}

export function esNiceto(persona: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): boolean {
  if ((persona.email ?? "").trim().toLowerCase() === CORREO_NICETO) return true;
  return `${persona.first_name ?? ""} ${persona.last_name ?? ""}`.toLowerCase().includes("niceto");
}

/** Niceto es un usuario más. Se reconoce por el nombre o por niceto@go.ugr.es. */
export function usuarioNiceto<T extends {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}>(personas: T[] | undefined): T | undefined {
  return personas?.find(esNiceto);
}

/**
 * Solo los pedidos de Farmacia que crea o aprueba Niceto prellenan su correo.
 * Prefill Para/De: niceto@go.ugr.es (ambos editables en el diálogo).
 * send-email autentica con smtp_accounts si De ≠ SMTP por defecto (contraseña en LabFlow).
 */
export function correoSiLoHaceNiceto(opts: {
  shippingAddressId: string | null | undefined;
  addresses: DireccionSede[] | undefined;
  requesterId: string | null | undefined;
  actorId: string | null | undefined;
  personas: Persona[] | undefined;
}): CorreoNiceto | null {
  if (!esPedidoFarmacia(opts.shippingAddressId, opts.addresses)) return null;

  const niceto = usuarioNiceto(opts.personas);
  if (!niceto) return null;
  const loHaceEl = opts.requesterId === niceto.id || opts.actorId === niceto.id;
  if (!loHaceEl) return null;

  const fromName = `${niceto.first_name ?? ""} ${niceto.last_name ?? ""}`.trim() || "Niceto";
  return {
    to: CORREO_NICETO,
    from: CORREO_NICETO,
    fromName,
  };
}

/** Rellena Para / De cuando el pedido de Farmacia lo hace Niceto. */
export function camposCorreoConNiceto(
  especial: CorreoNiceto | null | undefined,
  toPorDefecto: string
): { to: string; from?: string; fromName?: string } {
  if (!especial || especial.error) return { to: toPorDefecto };
  return { to: especial.to, from: especial.from, fromName: especial.fromName };
}
