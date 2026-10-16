import { resolveAddressSedeId } from "@/lib/sedes";

export const SEDE_FARMACIA = "farmacia";

type DireccionSede = { id: string; name?: string | null; sede_id?: string | null };

/** Un pedido es de Farmacia si su dirección de envío pertenece a esa sede. */
export function esPedidoFarmacia(
  shippingAddressId: string | null | undefined,
  addresses: DireccionSede[] | undefined
): boolean {
  if (!shippingAddressId || !addresses?.length) return false;
  const address = addresses.find((item) => item.id === shippingAddressId);
  if (!address) return false;
  return resolveAddressSedeId(address) === SEDE_FARMACIA;
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
