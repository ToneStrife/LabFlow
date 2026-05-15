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
  quantityInvoiced: number;
  quantityPending: number;
}

export const usePendingInvoices = () => {
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();

  return useQuery<PendingInvoiceItem[], Error>({
    queryKey: ['allPendingInvoices', requests, vendors],
    queryFn: async () => {
      if (!requests || !vendors) return [];

      // 1. Filtrar solicitudes que están en proceso o terminadas (Ordered o Received)
      // No incluimos 'Pending' o 'Quote Requested' porque aún no hay compromiso de pago real.
      const activeRequests = requests.filter(r => ['Ordered', 'Received'].includes(r.status));
      if (activeRequests.length === 0) return [];

      const requestIds = activeRequests.map(r => r.id);

      // 2. Obtener todos los registros de facturación para estas solicitudes
      const { data: invoicedData, error: invoicedError, status } = await supabase
        .from('invoiced_items')
        .select(`
          quantity_invoiced,
          request_item_id,
          invoice_id!inner (request_id)
        `)
        .in('invoice_id.request_id', requestIds);

      // Si la tabla no existe (404), tratamos como 0 facturado
      if (invoicedError && status !== 404) throw new Error(invoicedError.message);

      // 3. Agrupar facturaciones por request_item_id
      const invoicedMap = ((invoicedData || []) as any[]).reduce((acc, item) => {
        const itemId = item.request_item_id;
        acc[itemId] = (acc[itemId] || 0) + item.quantity_invoiced;
        return acc;
      }, {} as Record<string, number>);

      // 4. Construir la lista de ítems pendientes de factura
      const pendingInvoices: PendingInvoiceItem[] = [];

      activeRequests.forEach(req => {
        const vendor = vendors.find(v => v.id === req.vendor_id);
        const vendorName = vendor ? vendor.name : 'Desconocido';
        const requestNumber = req.request_number || req.id.substring(0, 8);

        req.items?.forEach(item => {
          const qtyInvoiced = invoicedMap[item.id] || 0;
          const qtyPending = item.quantity - qtyInvoiced;

          if (qtyPending > 0) {
            pendingInvoices.push({
              requestItemId: item.id,
              requestId: req.id,
              requestNumber: requestNumber,
              productName: item.product_name,
              catalogNumber: item.catalog_number,
              vendorName: vendorName,
              quantityOrdered: item.quantity,
              quantityInvoiced: qtyInvoiced,
              quantityPending: qtyPending,
            });
          }
        });
      });

      return pendingInvoices;
    },
    enabled: !!requests && !!vendors,
  });
};