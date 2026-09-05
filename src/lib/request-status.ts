import { RequestStatus } from "@/data/types";

/**
 * Fuente unica de verdad para como se presenta un estado de solicitud.
 * El valor guardado en Supabase sigue siendo el ingles (RequestStatus);
 * aqui solo decidimos como se ve en pantalla.
 */

/** Etiqueta corta, para insignias y celdas de tabla. */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  "Pending": "Pendiente",
  "Quote Requested": "Cot. solicitada",
  "PO Requested": "PO solicitado",
  "Ordered": "Pedido",
  "Received": "Recibido",
  "Denied": "Denegada",
  "Cancelled": "Cancelada",
};

/** Etiqueta larga, para desplegables y filtros donde hay sitio de sobra. */
export const REQUEST_STATUS_LABEL_LONG: Record<RequestStatus, string> = {
  "Pending": "Pendiente de aprobacion",
  "Quote Requested": "Cotizacion solicitada",
  "PO Requested": "Orden de compra solicitada",
  "Ordered": "Pedido realizado",
  "Received": "Recibido",
  "Denied": "Denegada",
  "Cancelled": "Cancelada",
};

/**
 * Color por estado. El flujo normal avanza por una progresion de tono
 * (ambar, azul, indigo, violeta, verde) para que se lea como progreso;
 * el rojo queda reservado a lo que de verdad ha fallado (denegada),
 * y el gris a lo que se abandono (cancelada).
 */
const REQUEST_STATUS_BADGE: Record<RequestStatus, string> = {
  "Pending":
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "Quote Requested":
    "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  "PO Requested":
    "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  "Ordered":
    "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200",
  "Received":
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  "Denied":
    "border-red-300 dark:border-red-900 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  "Cancelled":
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export function getRequestStatusLabel(status: RequestStatus): string {
  return REQUEST_STATUS_LABEL[status] ?? status;
}

export function getRequestStatusLabelLong(status: RequestStatus): string {
  return REQUEST_STATUS_LABEL_LONG[status] ?? status;
}

/** Clases de Tailwind para la insignia. Usar junto a <Badge variant="outline">. */
export function getRequestStatusBadgeClass(status: RequestStatus): string {
  return REQUEST_STATUS_BADGE[status] ?? REQUEST_STATUS_BADGE["Cancelled"];
}

/** Orden del flujo, util para ordenar listas por avance. */
export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "Pending",
  "Quote Requested",
  "PO Requested",
  "Ordered",
  "Received",
  "Denied",
  "Cancelled",
];
