import { RequestStatus } from "@/data/types";
import { getRequestStatusLabel } from "@/lib/request-status";
import type { QueryClient } from "@tanstack/react-query";

export const REQUEST_EVENTS_QUERY_KEY = ["requestEvents"] as const;

export function invalidateRequestEvents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: REQUEST_EVENTS_QUERY_KEY });
}

export type RequestEventType =
  | "created"
  | "status_changed"
  | "quote_attached"
  | "po_updated"
  | "packing_slip"
  | "invoice";

export interface ReceivedProduct {
  product_name: string;
  catalog_number: string;
  quantity: number;
}

export interface RequestEventPayload {
  request_number?: string | null;
  status?: string;
  from?: string;
  to?: string;
  quote_url?: string | null;
  po_number?: string | null;
  po_url?: string | null;
  slip_id?: string;
  slip_number?: string | null;
  invoice_id?: string;
  invoice_number?: string | null;
  items?: ReceivedProduct[];
}

export interface RequestEvent {
  id: string;
  created_at: string;
  request_id: string;
  actor_id: string | null;
  event_type: RequestEventType;
  payload: RequestEventPayload;
}

export const ETIQUETA_EVENTO: Record<RequestEventType, string> = {
  created: "Solicitud",
  status_changed: "Estado",
  quote_attached: "Cotización",
  po_updated: "Orden de compra",
  packing_slip: "Llegada",
  invoice: "Factura",
};

export function productosDelEvento(payload: RequestEventPayload | undefined): ReceivedProduct[] {
  return (payload?.items ?? []).filter((item) => item.product_name);
}

export function textoProductos(items: ReceivedProduct[]): string {
  return items
    .map((item) => {
      const ud = Number(item.quantity);
      const cant = Number.isFinite(ud) ? ` ×${ud}` : "";
      return `${item.product_name}${cant}`;
    })
    .join(", ");
}

export function tituloEvento(event: Pick<RequestEvent, "event_type" | "payload">): string {
  const { event_type: tipo, payload } = event;
  if (tipo === "created") return "Se pidió";
  if (tipo === "quote_attached") return "Se adjuntó la cotización";
  if (tipo === "po_updated") {
    return payload.po_number
      ? `Orden de compra ${payload.po_number}`
      : "Se actualizó la orden de compra";
  }
  if (tipo === "invoice") {
    return payload.invoice_number
      ? `Factura ${payload.invoice_number}`
      : "Se registró una factura";
  }
  if (tipo === "packing_slip") return "Llegó material";
  if (tipo === "status_changed") {
    switch (payload.to as RequestStatus) {
      case "Quote Requested":
        return "Se aprobó / se pidió cotización";
      case "PO Requested":
        return "Se pidió la orden de compra";
      case "Ordered":
        return "Se marcó como pedida";
      case "Received":
        return "Recepción completada";
      case "Denied":
        return "Se denegó";
      case "Cancelled":
        return "Se canceló";
      case "Pending":
        return "Volvió a pendiente";
      default:
        return payload.to
          ? `Pasó a ${getRequestStatusLabel(payload.to as RequestStatus)}`
          : "Cambio de estado";
    }
  }
  return ETIQUETA_EVENTO[tipo];
}

export function detalleEvento(event: Pick<RequestEvent, "event_type" | "payload">): string | null {
  if (event.event_type === "packing_slip") {
    const productos = textoProductos(productosDelEvento(event.payload));
    const albaran = event.payload.slip_number ? `Albarán ${event.payload.slip_number}` : null;
    if (productos && albaran) return `${productos} · ${albaran}`;
    return productos || albaran;
  }
  if (event.event_type === "status_changed" && event.payload.from && event.payload.to) {
    return `${getRequestStatusLabel(event.payload.from as RequestStatus)} → ${getRequestStatusLabel(event.payload.to as RequestStatus)}`;
  }
  return null;
}
