import type { Vendor, VendorLabOverride } from "@/data/types";

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

/** Aplica override de lab sobre la ficha base del proveedor. */
export function resolveVendorForLab(
  vendor: Vendor,
  override?: VendorLabOverride | null
): Vendor & { disabled_for_lab?: boolean } {
  if (!override) return vendor;
  return {
    ...vendor,
    email: override.email ?? vendor.email,
    email_presupuesto: override.email_presupuesto ?? vendor.email_presupuesto,
    email_pedido: override.email_pedido ?? vendor.email_pedido,
    contact_person: override.contact_person ?? vendor.contact_person,
    phone: override.phone ?? vendor.phone,
    notes: override.notes ?? vendor.notes,
    disabled_for_lab: override.disabled_for_lab,
  };
}

/**
 * Listado visible en un lab: globales (con override) ∪ privados del lab.
 * Excluye overrides disabled_for_lab.
 */
export function vendorsVisibleForLab(
  vendors: Vendor[] | undefined,
  overrides: VendorLabOverride[] | undefined,
  labId: string | null | undefined
): Vendor[] {
  if (!vendors?.length) return [];
  const byVendor = new Map(
    (overrides ?? []).filter((o) => !labId || o.lab_id === labId).map((o) => [o.vendor_id, o])
  );

  return vendors
    .filter((v) => {
      if (v.scope === "lab") return Boolean(labId && v.lab_id === labId);
      // global
      const ov = byVendor.get(v.id);
      if (ov?.disabled_for_lab) return false;
      return true;
    })
    .map((v) => resolveVendorForLab(v, byVendor.get(v.id)));
}
