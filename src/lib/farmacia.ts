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

/** Niceto centraliza los pedidos de Farmacia. */
export function gerenteFarmacia<T extends { first_name?: string | null; last_name?: string | null }>(
  managers: T[] | undefined
): T | undefined {
  return managers?.find(esNiceto);
}

/**
 * El correo de presupuesto va al proveedor, salvo en Farmacia: allí lo recibe
 * Niceto, que es quien pide el presupuesto y la compra.
 */
export function destinatarioPresupuesto(opts: {
  shippingAddressId: string | null | undefined;
  addresses: DireccionSede[] | undefined;
  managers: Array<{ first_name?: string | null; last_name?: string | null; email?: string | null }> | undefined;
  correoProveedor: string;
}): { to: string; error?: string } {
  if (!esPedidoFarmacia(opts.shippingAddressId, opts.addresses)) {
    return { to: opts.correoProveedor };
  }

  const niceto = gerenteFarmacia(opts.managers);
  const to = niceto?.email?.trim() ?? "";
  if (!to) {
    return {
      to: "",
      error: "En Farmacia el presupuesto se envía a Niceto y no tiene correo de gerente de cuenta.",
    };
  }
  return { to };
}
