import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PackingSlip, ReceivedItem, SupabaseRequestItem, RequestStatus } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";
import { uploadRequestFile } from "@/utils/upload-request-file";
import { invalidateRequestEvents, invalidatePendingLists } from "@/lib/activity";

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
        total_received: total_received as number, // Explicitly cast to number
      }));
    },
    enabled: !!requestId,
  });
};

export const useReceivedItemsBySlip = (slipId: string) => {
    return useQuery<ReceivedItem[], Error>({
        queryKey: ['receivedItemsBySlip', slipId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('received_items')
                .select(`
                    *,
                    request_item:request_items (product_name, catalog_number, quantity)
                `)
                .eq('slip_id', slipId);
            
            if (error) throw new Error(error.message);
            return data as ReceivedItem[];
        },
        enabled: !!slipId,
    });
};

export const useCorrectReceivedItemQuantity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ receivedItemId, newQuantity }: { receivedItemId: string; newQuantity: number }) => {
            // El RPC devuelve el received_item actualizado
            const { data, error } = await supabase.rpc('correct_received_item_quantity', {
                received_item_id_in: receivedItemId,
                new_quantity_in: newQuantity,
            }).single();

            if (error) throw new Error(error.message);
            
            // Necesitamos el request_id para invalidar las consultas
            const { data: slipData, error: slipError } = await supabase
                .from('packing_slips')
                .select('request_id')
                .eq('id', (data as any).slip_id)
                .single();
                
            if (slipError) throw new Error(`No se pudo obtener request_id: ${slipError.message}`);

            return { receivedItem: data as any, requestId: slipData.request_id };
        },
        onSuccess: ({ receivedItem, requestId }) => {
            // Invalidar consultas relacionadas con la solicitud y el inventario
            queryClient.invalidateQueries({ queryKey: ['packingSlips', requestId] });
            queryClient.invalidateQueries({ queryKey: ['aggregatedReceivedItems', requestId] });
            queryClient.invalidateQueries({ queryKey: ['receivedItemsBySlip', receivedItem.slip_id] }); // Invalida el detalle del albarán
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['requests'] }); // Por si el estado de la solicitud cambia
            invalidatePendingLists(queryClient);
            invalidateRequestEvents(queryClient);
            toast.success("Cantidad recibida corregida y inventario ajustado.");
        },
        onError: (error) => {
            toast.error("No se pudo corregir la cantidad recibida.", { description: error.message });
        }
    });
};

async function uploadSlipFile(requestId: string, file: File): Promise<string> {
  const { filePath } = await uploadRequestFile({
    requestId,
    fileType: "slip",
    file,
  });

  if (!filePath) {
    throw new Error("No se pudo obtener la ruta del archivo subido.");
  }

  return filePath;
}

async function updateRequestSlipUrl(requestId: string, slipFilePath: string) {
  const { error: updateReqError } = await supabase
    .from('requests')
    .update({ slip_url: slipFilePath })
    .eq('id', requestId);

  if (updateReqError) {
    console.error("Error updating request slip_url:", updateReqError);
  }
}

interface UploadSlipData {
  requestId: string;
  file: File;
  slipNumber?: string;
}

export const useUploadAndCreateSlip = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();
  
  return useMutation({
    mutationFn: async ({ requestId, file, slipNumber }: UploadSlipData) => {
      const receivedBy = session?.user?.id;
      if (!receivedBy) throw new Error("El usuario debe iniciar sesión para subir archivos.");

      const slipFilePath = await uploadSlipFile(requestId, file);
      
      // 2. Generar un número de albarán si no se proporciona
      let finalSlipNumber = slipNumber?.trim() || `SLIP-${Date.now()}`;
      
      // 3. Insertar el Albarán (Packing Slip)
      const { data: newSlip, error: slipError } = await supabase
        .from('packing_slips')
        .insert({
            request_id: requestId,
            slip_number: finalSlipNumber,
            received_by: receivedBy,
            slip_url: slipFilePath,
        })
        .select()
        .single();

      if (slipError) throw new Error(`No se pudo crear el registro de albarán: ${slipError.message}`);
      
      await updateRequestSlipUrl(requestId, slipFilePath);

      return newSlip;
    },
    onSuccess: (newSlip) => {
      queryClient.invalidateQueries({ queryKey: ['packingSlips', newSlip.request_id] });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      invalidateRequestEvents(queryClient);
      toast.success(`Albarán ${newSlip.slip_number} subido.`);
    },
    onError: (error) => {
      toast.error("No se pudo subir el albarán.", {
        description: error.message,
      });
    },
  });
};

export const useDeleteSlip = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (slipId: string) => {
            // Una sola función en la base de datos: descuenta del inventario lo que
            // sumó el albarán y lo borra, todo o nada. Si la solicitud está recibida
            // y el albarán tiene artículos, se niega (hay que revertir la recepción).
            const { data, error } = await supabase.rpc('delete_packing_slip', { p_slip_id: slipId });
            if (error) throw new Error(error.message);

            const requestId = (data as { request_id: string }).request_id;
            return { requestId, slipId };
        },
        onSuccess: ({ requestId, slipId }) => {
            queryClient.invalidateQueries({ queryKey: ['packingSlips', requestId] });
            queryClient.invalidateQueries({ queryKey: ['aggregatedReceivedItems', requestId] });
            queryClient.invalidateQueries({ queryKey: ['receivedItemsBySlip', slipId] });
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            invalidatePendingLists(queryClient);
            invalidateRequestEvents(queryClient);
            toast.success("Albarán eliminado.");
        },
        onError: (error) => {
            toast.error("No se pudo eliminar el albarán.", { description: error.message });
        }
    });
};

interface ReceiveItemsData {
  requestId: string;
  slipNumber: string;
  /** Sede del stock; la recepción siempre debe escribirla. */
  sedeId?: string | null;
  file?: File;
  items: {
    requestItemId: string;
    quantityReceived: number;
    storageLocation?: string | null;
    itemDetails: SupabaseRequestItem;
  }[];
}

export const useReceiveItems = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (data: ReceiveItemsData) => {
      const { requestId, slipNumber, file, items } = data;

      if (!session?.user?.id) throw new Error("El usuario debe iniciar sesión para recibir artículos.");

      // El archivo se sube antes porque la recepción necesita su ruta; si la
      // recepción falla se borra, para no dejar archivos sin albarán.
      const slipFilePath = file ? await uploadSlipFile(requestId, file) : null;

      // Albarán, líneas, inventario y estado de la solicitud, en una sola
      // transacción en la base de datos. Antes eran cuatro llamadas sueltas: un
      // fallo a medias y un reintento duplicaban lo recibido y el inventario.
      const { data: result, error } = await supabase.rpc('receive_items', {
        p_request_id: requestId,
        p_slip_number: slipNumber ?? '',
        p_slip_url: slipFilePath,
        p_sede_id: data.sedeId ?? null,
        p_items: items.map((item) => ({
          request_item_id: item.requestItemId,
          quantity_received: item.quantityReceived,
          storage_location: item.storageLocation ?? null,
        })),
      });

      if (error) {
        if (slipFilePath) {
          try {
            await supabase.storage.from('LabFlow').remove([slipFilePath]);
          } catch (cleanupError) {
            console.error("No se pudo borrar el albarán subido tras el fallo:", cleanupError);
          }
        }
        throw new Error(error.message);
      }

      return result as { id: string; request_id: string; slip_number: string; completa: boolean };
    },
    onSuccess: (result) => {
      toast.success(`Artículos recibidos.`, {
        description: `Albarán ${result.slip_number} registrado.`,
      });
      if (result.completa) {
        toast.info("Solicitud recibida completamente. Estado actualizado.");
      }
    },
    onError: (error) => {
      toast.error("No se pudo registrar la recepción del artículo.", {
        description: error.message,
      });
    },
    // Tanto si sale bien como si falla se vuelve a pedir lo recibido: tras un
    // fallo el asistente seguía con cantidades «ya recibidas» desfasadas.
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['aggregatedReceivedItems', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['packingSlips', variables.requestId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      invalidatePendingLists(queryClient);
      invalidateRequestEvents(queryClient);
    },
  });
};
