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
      // 1. Obtener todos los ítems recibidos para la solicitud
      const { data: receivedItems, error: receivedError } = await supabase
        .from('received_items')
        .select(`
          quantity_received,
          request_item_id,
          slip_id (request_id)
        `)
        .in('slip_id', supabase.from('packing_slips').select('id').eq('request_id', requestId).single());

      if (receivedError) throw new Error(receivedError.message);

      // 2. Agregar las cantidades por request_item_id
      const aggregation = receivedItems.reduce((acc, item) => {
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
          slip_number: slipNumber,
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
      // Esto requiere una lógica más compleja que se puede implementar en una función de base de datos
      // o en el cliente. Por simplicidad, lo haremos en el cliente por ahora.
      
      // Invalidar consultas para forzar la verificación del estado completo
      queryClient.invalidateQueries({ queryKey: ['requests', requestId] });
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