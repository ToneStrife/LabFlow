import { SupabaseRequest } from "@/data/types";

/**
 * Qué se puede hacer con una solicitud en cada fase. La hoja de solicitud y
 * la lista del panel usan esta misma función, para que nunca enseñen botones
 * distintos. El orden importa: la primera acción es la principal.
 *
 *   sin presupuesto      -> solicitar presupuesto (correo) / subir presupuesto
 *   con presupuesto      -> solicitar PO (correo al gerente) / registrar PO recibido
 *   con PO               -> marcar como pedido / enviar correo de pedido al proveedor
 *   pedido               -> recibir artículos / reenviar correo de pedido
 *   denegar mientras no hay PO; cancelar con PO o ya pedido
 */
export type AccionSolicitud =
  | "solicitar-presupuesto"
  | "subir-presupuesto"
  | "solicitar-po"
  | "registrar-po"
  | "marcar-pedido"
  | "correo-pedido"
  | "recibir"
  | "denegar"
  | "cancelar";

export interface PermisosSolicitud {
  /** Autor de la solicitud, o quien da el PO. */
  puedeSeguir: boolean;
  /** Administrador, gestor o IP del proyecto. */
  daElPo: boolean;
  puedeDenegar: boolean;
  puedeRecibir: boolean;
}

export function accionesDeSolicitud(
  request: Pick<SupabaseRequest, "status" | "quote_url" | "po_url" | "po_number">,
  permisos: PermisosSolicitud
): AccionSolicitud[] {
  const { puedeSeguir, daElPo, puedeDenegar, puedeRecibir } = permisos;
  const tienePresupuesto = Boolean(request.quote_url);
  const tienePo = Boolean(request.po_url || request.po_number);
  const acciones: AccionSolicitud[] = [];

  switch (request.status) {
    case "Pending":
    case "Quote Requested":
    case "PO Requested": {
      if (tienePo) {
        if (puedeSeguir) acciones.push("marcar-pedido", "correo-pedido");
      } else if (tienePresupuesto) {
        if (puedeSeguir) acciones.push("solicitar-po");
        if (daElPo) acciones.push("registrar-po");
      } else if (puedeSeguir) {
        acciones.push("solicitar-presupuesto", "subir-presupuesto");
      }

      // Con el presupuesto ya visto, el IP aún puede denegar mientras no haya PO.
      if (!tienePo && puedeDenegar) {
        acciones.push("denegar");
      } else if (puedeSeguir && (tienePo || request.status === "PO Requested")) {
        acciones.push("cancelar");
      }
      break;
    }
    case "Ordered":
      if (puedeRecibir) acciones.push("recibir");
      if (puedeSeguir) acciones.push("correo-pedido", "cancelar");
      break;
    default:
      break;
  }

  return acciones;
}

/**
 * En qué punto está la solicitud y qué falta, en una frase. Lo que se ve
 * arriba de las acciones, para saber de un vistazo a quién le toca.
 */
export function siguientePaso(
  request: Pick<SupabaseRequest, "status" | "quote_url" | "po_url" | "po_number">
): string | null {
  const tienePresupuesto = Boolean(request.quote_url);
  const tienePo = Boolean(request.po_url || request.po_number);

  switch (request.status) {
    case "Pending":
    case "Quote Requested":
    case "PO Requested":
      if (tienePo) return "Ya hay PO. Falta hacer el pedido al proveedor.";
      if (tienePresupuesto) return "Ya hay presupuesto. Falta el PO del gerente de cuenta.";
      if (request.status === "Quote Requested") return "Esperando el presupuesto del proveedor.";
      return "Falta pedir el presupuesto al proveedor o subirlo si ya lo tienes.";
    case "Ordered":
      return "Pedido hecho. Falta que lleguen los artículos.";
    case "Received":
      return "Todo recibido. Solicitud completada.";
    case "Denied":
      return "Solicitud denegada.";
    case "Cancelled":
      return "Solicitud cancelada.";
    default:
      return null;
  }
}
