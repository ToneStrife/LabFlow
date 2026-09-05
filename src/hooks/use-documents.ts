import { useQuery } from "@tanstack/react-query";
import React from "react";
import { supabase } from "@/lib/supabase";
import { Invoice, PackingSlip } from "@/data/types";
import { useRequests } from "@/hooks/use-requests";
import { useVendors } from "@/hooks/use-vendors";
import { useAllProfiles, getFullName } from "@/hooks/use-profiles";
import { getFileNameFromPath } from "@/utils/email-attachments";

export type TipoDocumento = "cotizacion" | "orden" | "albaran" | "factura";

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  /** Ruta en el almacenamiento, la que necesita generateSignedUrl */
  ruta: string;
  /** Número de albarán, de factura o de PO. Vacío si el documento no lo tiene */
  referencia: string | null;
  requestId: string;
  requestNumber: string;
  vendorId: string;
  vendorName: string;
  /** Quién abrió la solicitud a la que pertenece el documento */
  requesterId: string;
  requesterName: string;
  fecha: string;
  nombreArchivo: string;
}

export const ETIQUETA_TIPO: Record<TipoDocumento, string> = {
  cotizacion: "Cotización",
  orden: "Orden de compra",
  albaran: "Albarán",
  factura: "Factura",
};

/** Todos los albaranes, de todas las solicitudes. Los hooks que había eran por solicitud. */
const useTodosLosAlbaranes = () =>
  useQuery<PackingSlip[], Error>({
    queryKey: ["packingSlips", "todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packing_slips")
        .select("*")
        .order("received_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

/** Todas las facturas. Tolera que la tabla no exista, igual que useInvoices. */
const useTodasLasFacturas = () =>
  useQuery<Invoice[], Error>({
    queryKey: ["invoices", "todas"],
    queryFn: async () => {
      const { data, error, status } = await supabase
        .from("invoices")
        .select("*")
        .order("invoiced_at", { ascending: false });
      if (error && status === 404) return [];
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

/**
 * Reúne en una sola lista los documentos que hoy viven repartidos en tres
 * tablas: cotizaciones y órdenes de compra cuelgan de la solicitud, los
 * albaranes de packing_slips y las facturas de invoices.
 */
export const useDocumentos = () => {
  const { data: solicitudes, isLoading: cargandoSolicitudes, error } = useRequests();
  const { data: proveedores, isLoading: cargandoProveedores } = useVendors();
  const { data: perfiles } = useAllProfiles();
  const { data: albaranes, isLoading: cargandoAlbaranes } = useTodosLosAlbaranes();
  const { data: facturas, isLoading: cargandoFacturas } = useTodasLasFacturas();

  const documentos = React.useMemo<Documento[]>(() => {
    if (!solicitudes) return [];

    const porId = new Map(solicitudes.map((s) => [s.id, s]));
    const nombreProveedor = (vendorId: string) =>
      proveedores?.find((p) => p.id === vendorId)?.name ?? "Sin proveedor";
    const nombreSolicitante = (requesterId: string) =>
      getFullName(perfiles?.find((p) => p.id === requesterId));
    const referenciaSolicitud = (id: string) => {
      const s = porId.get(id);
      return s?.request_number || id.substring(0, 8);
    };

    const lista: Documento[] = [];

    for (const s of solicitudes) {
      const comunes = {
        requestId: s.id,
        requestNumber: s.request_number || s.id.substring(0, 8),
        vendorId: s.vendor_id,
        vendorName: nombreProveedor(s.vendor_id),
        requesterId: s.requester_id,
        requesterName: nombreSolicitante(s.requester_id),
        fecha: s.created_at,
      };
      if (s.quote_url) {
        lista.push({
          id: `cot-${s.id}`,
          tipo: "cotizacion",
          ruta: s.quote_url,
          referencia: null,
          nombreArchivo: getFileNameFromPath(s.quote_url),
          ...comunes,
        });
      }
      if (s.po_url) {
        lista.push({
          id: `po-${s.id}`,
          tipo: "orden",
          ruta: s.po_url,
          referencia: s.po_number,
          nombreArchivo: getFileNameFromPath(s.po_url),
          ...comunes,
        });
      }
    }

    for (const a of albaranes || []) {
      if (!a.slip_url) continue;
      lista.push({
        id: `alb-${a.id}`,
        tipo: "albaran",
        ruta: a.slip_url,
        referencia: a.slip_number,
        requestId: a.request_id,
        requestNumber: referenciaSolicitud(a.request_id),
        vendorId: porId.get(a.request_id)?.vendor_id ?? "",
        vendorName: nombreProveedor(porId.get(a.request_id)?.vendor_id ?? ""),
        requesterId: porId.get(a.request_id)?.requester_id ?? "",
        requesterName: nombreSolicitante(porId.get(a.request_id)?.requester_id ?? ""),
        fecha: a.received_at,
        nombreArchivo: getFileNameFromPath(a.slip_url),
      });
    }

    for (const f of facturas || []) {
      if (!f.invoice_url) continue;
      lista.push({
        id: `fac-${f.id}`,
        tipo: "factura",
        ruta: f.invoice_url,
        referencia: f.invoice_number,
        requestId: f.request_id,
        requestNumber: referenciaSolicitud(f.request_id),
        vendorId: porId.get(f.request_id)?.vendor_id ?? "",
        vendorName: nombreProveedor(porId.get(f.request_id)?.vendor_id ?? ""),
        requesterId: porId.get(f.request_id)?.requester_id ?? "",
        requesterName: nombreSolicitante(porId.get(f.request_id)?.requester_id ?? ""),
        fecha: f.invoiced_at,
        nombreArchivo: getFileNameFromPath(f.invoice_url),
      });
    }

    // Un mismo fichero puede estar referenciado dos veces (por ejemplo el
    // albarán antiguo guardado en la solicitud y el de packing_slips)
    const vistos = new Set<string>();
    return lista
      .filter((d) => (vistos.has(d.ruta) ? false : (vistos.add(d.ruta), true)))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [solicitudes, proveedores, perfiles, albaranes, facturas]);

  return {
    documentos,
    isLoading:
      cargandoSolicitudes || cargandoProveedores || cargandoAlbaranes || cargandoFacturas,
    error,
  };
};
