import type { Vendor } from "@/data/types";

/** Correo para pedir presupuesto (Quote Request). */
export function correoPresupuestoProveedor(
  vendor: Pick<Vendor, "email" | "email_presupuesto"> | null | undefined
): string {
  return (vendor?.email_presupuesto || vendor?.email || "").trim();
}

/** Correo para confirmar el pedido al proveedor (Order Confirmation). */
export function correoPedidoProveedor(
  vendor: Pick<Vendor, "email" | "email_pedido"> | null | undefined
): string {
  return (vendor?.email_pedido || vendor?.email || "").trim();
}
