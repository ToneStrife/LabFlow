import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useRequests } from "./use-requests";
import { useVendors } from "./use-vendors";

export interface PendingItem {
  requestItemId: string;
  requestId: string;
  requestNumber: string;
  productName: string;
  catalogNumber: string;
  vendorName: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityPending: number;
}

export const usePendingItems = () => {
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();

  return useQuery<PendingItem[], Error>({
    queryKey: ['allPendingItems', requests, vendors],
    queryFn: async () => {
      if (!requests || !vendors) return [];

      // 1. Filtrar solicitudes que están en estado 'Ordered' (Pedido)
      const orderedRequests = requests.filter(r => r.status === 'Ordered');
      if (orderedRequests.length === 0) return [];

      const requestIds = orderedRequests.map(r => r.id);

      // 2. Obtener todos los registros de recepción para estas solicitudes
      const { data: receivedData, error: receivedError } = await supabase
        .from('received_items')
        .select(`
          quantity_received,
          request_item_id,
          slip_id!inner (request_id)
        `)
        .in('slip_id.request_id', requestIds);

      if (receivedError) throw new Error(receivedError.message);

      // 3. Agrupar recepciones por request_item_id
      const receivedMap = (receivedData as any[]).reduce((acc, item) => {
        const itemId = item.request_item_id;
        acc[itemId] = (acc[itemId] || 0) + item.quantity_received;
        return acc;
      }, {} as Record<string, number>);

      // 4. Construir la lista de ítems pendientes
      const pendingItems: PendingItem[] = [];

      orderedRequests.forEach(req => {
        const vendor = vendors.find(v => v.id === req.vendor_id);
        const vendorName = vendor ? vendor.name : 'Desconocido';
        const requestNumber = req.request_number || req.id.substring(0, 8);

        req.items?.forEach(item => {
          const qtyReceived = receivedMap[item.id] || 0;
          const qtyPending = item.quantity - qtyReceived;

          if (qtyPending > 0) {
            pendingItems.push({
              requestItemId: item.id,
              requestId: req.id,
              requestNumber: requestNumber,
              productName: item.product_name,
              catalogNumber: item.catalog_number,
              vendorName: vendorName,
              quantityOrdered: item.quantity,
              quantityReceived: qtyReceived,
              quantityPending: qtyPending,
            });
          }
        });
      });

      return pendingItems;
    },
    enabled: !!requests && !!vendors,
  });
};