import { useQuery } from "@tanstack/react-query";
import React from "react";
import { supabase } from "@/lib/supabase";
import { useRequests } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { useShippingAddresses } from "@/hooks/use-addresses";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { filterRequestsBySede } from "@/lib/sedes";
import {
  REQUEST_EVENTS_QUERY_KEY,
  detalleEvento,
  tituloEvento,
  textoProductos,
  productosDelEvento,
  type RequestEvent,
  type RequestEventType,
} from "@/lib/activity";

export type { RequestEvent, RequestEventType };

export interface ActivityEvent extends RequestEvent {
  requestNumber: string;
  vendorName: string;
  actorName: string;
  titulo: string;
  detalle: string | null;
  busqueda: string;
}

const useRequestEventsRaw = () =>
  useQuery<RequestEvent[], Error>({
    queryKey: REQUEST_EVENTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as RequestEvent[];
    },
  });

export const useActivityEvents = () => {
  const { data: events, isLoading: cargandoEventos, error } = useRequestEventsRaw();
  const { data: requests, isLoading: cargandoSolicitudes } = useRequests();
  const { data: vendors, isLoading: cargandoProveedores } = useVendors();
  const { data: profiles } = useAllProfiles();
  const { data: shippingAddresses, isLoading: cargandoDir } = useShippingAddresses();
  const { sedeActiva } = useSedeActiva();

  const actividad = React.useMemo<ActivityEvent[]>(() => {
    if (!events || !requests) return [];

    const porSede = new Set(
      filterRequestsBySede(requests, shippingAddresses, sedeActiva).map((r) => r.id)
    );
    const porId = new Map(requests.map((r) => [r.id, r]));
    const nombreProveedor = (vendorId: string | undefined) =>
      vendors?.find((v) => v.id === vendorId)?.name ?? "Sin proveedor";

    return events
      .filter((e) => porSede.has(e.request_id))
      .map((e) => {
        const solicitud = porId.get(e.request_id);
        const requestNumber =
          solicitud?.request_number || e.payload.request_number || e.request_id.substring(0, 8);
        const vendorName = nombreProveedor(solicitud?.vendor_id);
        const actorName =
          e.actor_id ? getFullName(profiles?.find((p) => p.id === e.actor_id)) : "";
        const productosSolicitud = (solicitud?.items ?? [])
          .map((item) => `${item.product_name} ${item.catalog_number}`)
          .join(" ");
        const productosEvento = textoProductos(productosDelEvento(e.payload));
        const titulo = tituloEvento(e);
        const detalle = detalleEvento(e);

        return {
          ...e,
          requestNumber,
          vendorName,
          actorName: actorName === "N/A" ? "" : actorName,
          titulo,
          detalle,
          busqueda: [
            requestNumber,
            vendorName,
            actorName,
            titulo,
            detalle ?? "",
            e.payload.slip_number,
            e.payload.invoice_number,
            e.payload.po_number,
            productosEvento,
            productosSolicitud,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
        };
      });
  }, [events, requests, vendors, profiles, shippingAddresses, sedeActiva]);

  return {
    actividad,
    isLoading: cargandoEventos || cargandoSolicitudes || cargandoProveedores || cargandoDir,
    error,
  };
};

export const useRequestActivity = (requestId: string | undefined) => {
  const { data: events, isLoading, error } = useRequestEventsRaw();
  const { data: profiles } = useAllProfiles();

  const actividad = React.useMemo<ActivityEvent[]>(() => {
    if (!events || !requestId) return [];
    return events
      .filter((e) => e.request_id === requestId)
      .map((e) => {
        const actorName =
          e.actor_id ? getFullName(profiles?.find((p) => p.id === e.actor_id)) : "";
        return {
          ...e,
          requestNumber: e.payload.request_number || requestId.substring(0, 8),
          vendorName: "",
          actorName: actorName === "N/A" ? "" : actorName,
          titulo: tituloEvento(e),
          detalle: detalleEvento(e),
          busqueda: "",
        };
      });
  }, [events, requestId, profiles]);

  return { actividad, isLoading, error };
};
