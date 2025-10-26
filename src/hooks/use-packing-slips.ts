import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PackingSlip, ReceivedItem, SupabaseRequestItem, RequestStatus } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";

// --- Fetch Hooks ---

// Obtener todos los albaranes para una solicitud
export const usePackingSlips = (requestId: string) => {
  return useQuery<PackingSlip[], Error>({
    queryKey: ['packingSlips', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packing_slips')
        .select('*')
        .eq('request_id', requestId)
        .order('received_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!requestId,
  });
};

// Obtener ítems recibidos para una solicitud (agregados por request_item_id)
interface AggregatedReceivedItem {
  request_item_id: string;
  total_received: number;
}

export const useAggregatedReceivedItems = (requestId: string) => {
  return useQuery<AggregatedReceivedItem[], Error>({
    queryKey: ['aggregatedReceivedItems', requestId],
    queryFn: async () => {
      // 1. Obtener todos los ítems recibidos para la solicitud, filtrando por la relación packing_slips.request_id
      const { data: receivedItems, error: receivedError } = await supabase
        .from('received_items')
        .select(`
          quantity_received,
          request_item_id,
          slip_id!inner (request_id)
        `)
        .eq('slip_id.request_id', requestId); // Filtrar por el ID de la solicitud a través de la tabla packing_slips

      if (receivedError) throw new Error(receivedError.message);

      // 2. Agregar las cantidades por request_item_id
      const aggregation = (receivedItems as any[]).reduce((acc, item) => {
        const itemId = item.request_item_id;
        acc[itemId] = (acc[itemId] || 0) + item.quantity_received;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(aggregation).map(([request_item_id, total_received]) => ({
        request_item_id,
        total_received,
      }));
    },
    enabled: !!requestId,
  });
};


// --- Mutation Hook para Recepción ---

interface ReceiveItemsData {
  requestId: string;
  slipNumber: string;
  slipFile: File | null;
  items: {
    requestItemId: string;
    quantityReceived: number;
    itemDetails: SupabaseRequestItem; // Para actualizar inventario
  }[];
}

export const useReceiveItems = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (data: ReceiveItemsData) => {
      const { requestId, slipNumber, slipFile, items } = data;
      const receivedBy = session?.user?.id;

      if (!receivedBy) throw new Error("User must be logged in to receive items.");

      // --- SOLUCIÓN AL ERROR DE UNICIDAD ---
      // Si slipNumber está vacío, generamos uno basado en el timestamp para evitar colisiones.
      let finalSlipNumber = slipNumber.trim();
      if (!finalSlipNumber) {
        finalSlipNumber = `AUTO-${Date.now()}`;
      }
      // ------------------------------------

      // 1. Subir el archivo del albarán si existe
      let slipFilePath: string | null = null;
      if (slipFile) {
        // Usamos la función Edge 'upload-file' para subir el archivo
        const formData = new FormData();
        formData.append('file', slipFile);
        formData.append('fileType', 'slip');
        formData.append('requestId', requestId);

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-file', {
          body: formData,
          method: 'POST',
        });

        if (uploadError) {
          console.error("Error uploading slip file:", uploadError);
          throw new Error(`Failed to upload slip file: ${uploadError.message}`);
        }
        
        // La función Edge devuelve { filePath: string | null, poNumber: string | null }
        slipFilePath = (uploadData as { filePath: string | null }).filePath;
      }

      // 2. Insertar el Albarán (Packing Slip)
      const { data: newSlip, error: slipError } = await supabase
        .from('packing_slips')
        .insert({
          request_id: requestId,
          slip_number: finalSlipNumber, // Usar el número final (generado o proporcionado)
          received_by: receivedBy,
          slip_url: slipFilePath,
        })
        .select()
        .single();

      if (slipError) throw new Error(`Failed to create packing slip: ${slipError.message}`);

      const slipId = newSlip.id;

      // 3. Insertar los Ítems Recibidos y actualizar el Inventario
      const receivedItemInserts = items.map(item => ({
        slip_id: slipId,
        request_item_id: item.requestItemId,
        quantity_received: item.quantityReceived,
      }));

      const { error: receivedItemsError } = await supabase
        .from('received_items')
        .insert(receivedItemInserts);

      if (receivedItemsError) throw new Error(`Failed to insert received items: ${receivedItemsError.message}`);

      // 4. Actualizar el Inventario (usando RPC para manejar la lógica de upsert)
      for (const item of items) {
        if (item.quantityReceived > 0) {
          const { error: inventoryError } = await supabase.rpc('add_or_update_inventory_item', {
            product_name_in: item.itemDetails.product_name,
            catalog_number_in: item.itemDetails.catalog_number,
            brand_in: item.itemDetails.brand,
            quantity_in: item.quantityReceived,
            unit_price_in: item.itemDetails.unit_price,
            format_in: item.itemDetails.format,
          });
          if (inventoryError) throw new Error(`Failed to update inventory for ${item.itemDetails.product_name}: ${inventoryError.message}`);
        }
      }

      // 5. Verificar si la solicitud está completamente recibida y actualizar el estado
      
      // Obtener la solicitud completa con ítems
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select(`
          id,
          status,
          items:request_items (id, quantity)
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw new Error(`Failed to fetch request details for status check: ${requestError.message}`);

      // Obtener el total recibido agregado (usando la misma lógica que el hook de fetch)
      const { data: aggregatedReceived, error: aggError } = await supabase
        .from('received_items')
        .select(`
          quantity_received,
          request_item_id,
          slip_id!inner (request_id)
        `)
        .eq('slip_id.request_id', requestId);

      if (aggError) throw new Error(`Failed to fetch aggregated received items for status check: ${aggError.message}`);

      const aggregation = (aggregatedReceived as any[]).reduce((acc, item) => {
        const itemId = item.request_item_id;
        acc[itemId] = (acc[itemId] || 0) + item.quantity_received;
        return acc;
      }, {} as Record<string, number>);

      const allItemsReceived = requestData.items.every(item => {
        const totalOrdered = item.quantity;
        const totalReceived = aggregation[item.id] || 0;
        return totalReceived >= totalOrdered;
      });

      if (allItemsReceived && requestData.status !== 'Received') {
        // Actualizar el estado de la solicitud a 'Received'
        const { error: statusUpdateError } = await supabase
          .from('requests')
          .update({ status: 'Received' as RequestStatus })
          .eq('id', requestId);
        
        if (statusUpdateError) {
          console.error("Error updating request status to Received:", statusUpdateError);
          // No lanzamos un error fatal, solo registramos.
        } else {
          toast.info(`Request ${requestId} is now fully received! Status updated.`);
        }
      }


      // Invalidar consultas para forzar la verificación del estado completo
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['aggregatedReceivedItems', requestId] });
      queryClient.invalidateQueries({ queryKey: ['packingSlips', requestId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      return newSlip;
    },
    onSuccess: (newSlip) => {
      toast.success(`Items received successfully!`, {
        description: `Packing Slip #${newSlip.slip_number} recorded.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to record item reception.", {
        description: error.message,
      });
    },
  });
};