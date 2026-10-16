import { inferSedeIdFromName, resolveAddressSedeId } from "@/lib/sedes";

export const SEDE_FARMACIA = "farmacia";

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

export function esNiceto(persona: { first_name?: string | null; last_name?: string | null }): boolean {
  return `${persona.first_name ?? ""} ${persona.last_name ?? ""}`.toLowerCase().includes("niceto");
}

/** Niceto es un usuario más. Se reconoce por el nombre en su ficha. */
export function usuarioNiceto<T extends { first_name?: string | null; last_name?: string | null }>(
  personas: T[] | undefined
): T | undefined {
  return personas?.find(esNiceto);
}

/**
 * Solo los pedidos de Farmacia que crea o aprueba Niceto salen a su correo.
 * En cualquier otro caso devuelve null y el correo sigue el camino de siempre.
 */
export function correoSiLoHaceNiceto(opts: {
  shippingAddressId: string | null | undefined;
  addresses: DireccionSede[] | undefined;
  requesterId: string | null | undefined;
  actorId: string | null | undefined;
  personas: Persona[] | undefined;
}): { to: string; error?: string } | null {
  if (!esPedidoFarmacia(opts.shippingAddressId, opts.addresses)) return null;

  const niceto = usuarioNiceto(opts.personas);
  if (!niceto) return null;
  const loHaceEl = opts.requesterId === niceto.id || opts.actorId === niceto.id;
  if (!loHaceEl) return null;

  const to = niceto.email?.trim() ?? "";
  if (!to) {
    return { to: "", error: "Niceto no tiene correo en su usuario." };
  }
  return { to };
}
