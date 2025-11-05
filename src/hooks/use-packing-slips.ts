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
        total_received: total_received as number, // Explicitly cast to number
      }));
    },
    enabled: !!requestId,
  });
};


// --- Mutation Hook para Recepción ---

interface ReceiveItemsData {
  requestId: string;
  slipNumber: string;
  slipFiles: File[]; // CAMBIADO: Ahora es un array de archivos
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
      const { requestId, slipNumber, slipFiles, items } = data;
      const receivedBy = session?.user?.id;

      if (!receivedBy) throw new Error("El usuario debe iniciar sesión para recibir artículos.");

      // --- SOLUCIÓN AL ERROR DE UNICIDAD ---
      // Si slipNumber está vacío, generamos uno basado en el timestamp para evitar colisiones.
      let finalSlipNumber = slipNumber.trim();
      if (!finalSlipNumber) {
        finalSlipNumber = `AUTO-${Date.now()}`;
      }
      // ------------------------------------

      // 1. Subir los archivos de albarán si existen
      let slipFilePath: string | null = null;
      
      // Si hay múltiples archivos, solo usamos el primero para el campo slip_url de la tabla requests
      // y el resto se sube pero no se registra en requests.slip_url.
      // Sin embargo, para simplificar, solo subiremos el primer archivo y lo vincularemos al albarán.
      // Si hay múltiples archivos, crearemos múltiples albaranes.
      
      const uploadedFilePaths: string[] = [];
      
      for (const file of slipFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileType', 'slip');
          formData.append('requestId', requestId);

          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-file', {
            body: formData,
            method: 'POST',
          });

          if (uploadError) {
            console.error("Error uploading slip file:", uploadError);
            // No lanzamos un error fatal, solo registramos y continuamos
            toast.warning(`Fallo al subir el archivo ${file.name}. Continuando con la recepción.`);
            continue;
          }
          
          const path = (uploadData as { filePath: string | null }).filePath;
          if (path) {
              uploadedFilePaths.push(path);
          }
      }
      
      // Usamos el primer archivo subido para actualizar requests.slip_url (para compatibilidad)
      slipFilePath = uploadedFilePaths[0] || null;


      // 2. Insertar el Albarán (Packing Slip)
      // Si hay múltiples archivos, creamos un albarán por archivo.
      // Si no hay archivos, creamos un albarán sin URL.
      
      const slipsToInsert = uploadedFilePaths.length > 0 
        ? uploadedFilePaths.map((path, index) => ({
            request_id: requestId,
            slip_number: `${finalSlipNumber}${uploadedFilePaths.length > 1 ? `-${index + 1}` : ''}`,
            received_by: receivedBy,
            slip_url: path,
          }))
        : [{
            request_id: requestId,
            slip_number: finalSlipNumber,
            received_by: receivedBy,
            slip_url: null,
          }];
          
      const { data: newSlips, error: slipError } = await supabase
        .from('packing_slips')
        .insert(slipsToInsert)
        .select();

      if (slipError) throw new Error(`Fallo al crear el albarán: ${slipError.message}`);

      // 3. Insertar los Ítems Recibidos y actualizar el Inventario
      const slipIds = newSlips.map(s => s.id);
      const primarySlipId = slipIds[0]; // Usamos el primer slip ID para vincular todos los ítems recibidos

      const receivedItemInserts = items.map(item => ({
        slip_id: primarySlipId, // Vinculamos todos los ítems recibidos al primer albarán creado
        request_item_id: item.requestItemId,
        quantity_received: item.quantityReceived,
      }));

      const { error: receivedItemsError } = await supabase
        .from('received_items')
        .insert(receivedItemInserts);

      if (receivedItemsError) throw new Error(`Fallo al insertar artículos recibidos: ${receivedItemsError.message}`);

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
          if (inventoryError) throw new Error(`Fallo al actualizar el inventario para ${item.itemDetails.product_name}: ${inventoryError.message}`);
        }
      }
      
      // 5. Actualizar requests.slip_url con el path del primer archivo subido (para compatibilidad)
      if (slipFilePath) {
          const { error: updateReqError } = await supabase
            .from('requests')
            .update({ slip_url: slipFilePath })
            .eq('id', requestId);
            
          if (updateReqError) {
              console.error("Error updating request slip_url:", updateReqError);
          }
      }


      // 6. Verificar si la solicitud está completamente recibida y actualizar el estado
      
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

      if (requestError) throw new Error(`Fallo al obtener detalles de la solicitud para la verificación de estado: ${requestError.message}`);

      // Obtener el total recibido agregado (usando la misma lógica que el hook de fetch)
      const { data: aggregatedReceived, error: aggError } = await supabase
        .from('received_items')
        .select(`
          quantity_received,
          request_item_id,
          slip_id!inner (request_id)
        `)
        .eq('slip_id.request_id', requestId);

      if (aggError) throw new Error(`Fallo al obtener artículos recibidos agregados para la verificación de estado: ${aggError.message}`);

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
          toast.info(`Solicitud ${requestId} recibida completamente! Estado actualizado.`);
        }
      }


      // Invalidar consultas para forzar la verificación del estado completo
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['aggregatedReceivedItems', requestId] });
      queryClient.invalidateQueries({ queryKey: ['packingSlips', requestId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });

      return newSlips;
    },
    onSuccess: (newSlips) => {
      const slipNumbers = newSlips.map(s => s.slip_number).join(', ');
      toast.success(`Artículos recibidos exitosamente!`, {
        description: `Albarán(es) ${slipNumbers} registrado(s).`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al registrar la recepción del artículo.", {
        description: error.message,
      });
    },
  });
};