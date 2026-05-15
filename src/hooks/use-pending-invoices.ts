import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRequests } from "./use-requests";
import { useVendors } from "./use-vendors";

export interface PendingInvoiceItem {
  requestItemId: string;
  requestId: string;
  requestNumber: string;
  productName: string;
  catalogNumber: string;
  vendorName: string;
  quantityOrdered: number;
  quantityReceived: number; // Añadido para claridad
  quantityInvoiced: number;
  quantityPending: number; // Ahora representa: Recibido - Facturado
}

export const usePendingInvoices = () => {
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();

  return useQuery<PendingInvoiceItem[], Error>({
    queryKey: ['allPendingInvoices', requests, vendors],
    queryFn: async () => {
      if (!requests || !vendors) return [];

      // 1. Obtener IDs de todas las solicitudes activas (Ordered o Received)
      const activeRequestIds = requests
        .filter(r => ['Ordered', 'Received'].includes(r.status))
        .map(r => r.id);
        
      if (activeRequestIds.length === 0) return [];

      // 2. Obtener TODAS las recepciones y TODAS las facturaciones para estas solicitudes
      const [receivedRes, invoicedRes] = await Promise.all([
        supabase.from('received_items').select('quantity_received, request_item_id, slip_id!inner(request_id)').in('slip_id.request_id', activeRequestIds),
        supabase.from('invoiced_items').select('quantity_invoiced, request_item_id, invoice_id!inner(request_id)').in('invoice_id.request_id', activeRequestIds)
      ]);

      // Manejo de errores de tabla no existente (404)
      const receivedData = receivedRes.data || [];
      const invoicedData = invoicedRes.data || [];

      // 3. Agrupar por ítem
      const receivedMap = (receivedData as any[]).reduce((acc, item) => {
        acc[item.request_item_id] = (acc[item.request_item_id] || 0) + item.quantity_received;
        return acc;
      }, {} as Record<string, number>);

      const invoicedMap = (invoicedData as any[]).reduce((acc, item) => {
        acc[item.request_item_id] = (acc[item.request_item_id] || 0) + item.quantity_invoiced;
        return acc;
      }, {} as Record<string, number>);

      // 4. Construir la lista basada en la lógica: "Lo que está en el lab pero no se ha facturado"
      const pendingInvoices: PendingInvoiceItem[] = [];

      requests.filter(r => ['Ordered', 'Received'].includes(r.status)).forEach(req => {
        const vendorName = vendors.find(v => v.id === req.vendor_id)?.name || 'Desconocido';
        const requestNumber = req.request_number || req.id.substring(0, 8);

        req.items?.forEach(item => {
          const qtyReceived = receivedMap[item.id] || 0;
          const qtyInvoiced = invoicedMap[item.id] || 0;
          
          // Lógica clave: Si hemos recibido más de lo que hemos facturado, hay una deuda de factura.
          const qtyPendingInvoice = qtyReceived - qtyInvoiced;

          if (qtyPendingInvoice > 0) {
            pendingInvoices.push({
              requestItemId: item.id,
              requestId: req.id,
              requestNumber: requestNumber,
              productName: item.product_name,
              catalogNumber: item.catalog_number,
              vendorName: vendorName,
              quantityOrdered: item.quantity,
              quantityReceived: qtyReceived,
              quantityInvoiced: qtyInvoiced,
              quantityPending: qtyPendingInvoice,
            });
          }
        });
      });

      return pendingInvoices;
    },
    enabled: !!requests && !!vendors,
  });
};