import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Invoice, InvoicedItem, SupabaseRequestItem } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";

// --- Fetch Hooks ---

export const useInvoices = (requestId: string) => {
  return useQuery<Invoice[], Error>({
    queryKey: ['invoices', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('request_id', requestId)
        .order('invoiced_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!requestId,
  });
};

interface AggregatedInvoicedItem {
  request_item_id: string;
  total_invoiced: number;
}

export const useAggregatedInvoicedItems = (requestId: string) => {
  return useQuery<AggregatedInvoicedItem[], Error>({
    queryKey: ['aggregatedInvoicedItems', requestId],
    queryFn: async () => {
      const { data: invoicedItems, error } = await supabase
        .from('invoiced_items')
        .select(`
          quantity_invoiced,
          request_item_id,
          invoice_id!inner (request_id)
        `)
        .eq('invoice_id.request_id', requestId);

      if (error) throw new Error(error.message);

      const aggregation = (invoicedItems as any[]).reduce((acc, item) => {
        const itemId = item.request_item_id;
        acc[itemId] = (acc[itemId] || 0) + item.quantity_invoiced;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(aggregation).map(([request_item_id, total_invoiced]) => ({
        request_item_id,
        total_invoiced: total_invoiced as number,
      }));
    },
    enabled: !!requestId,
  });
};

// --- Mutation Hooks ---

interface InvoiceItemsData {
  requestId: string;
  invoiceNumber: string;
  file: File | null;
  items: {
    requestItemId: string;
    quantityInvoiced: number;
  }[];
}

export const useInvoiceItems = () => {
  const queryClient = useQueryClient();
  const { session } = useSession();

  return useMutation({
    mutationFn: async (data: InvoiceItemsData) => {
      const { requestId, invoiceNumber, file, items } = data;
      const invoicedBy = session?.user?.id;

      if (!invoicedBy) throw new Error("Debes iniciar sesión.");

      let invoiceUrl: string | null = null;

      // 1. Subir archivo si existe
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', 'invoice'); // Usamos un tipo genérico o específico
        formData.append('requestId', requestId);

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-file', {
          body: formData,
          method: 'POST',
        });

        if (uploadError) throw new Error(`Fallo al subir factura: ${uploadError.message}`);
        invoiceUrl = (uploadData as any).filePath;
      }

      // 2. Insertar Factura
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
            request_id: requestId,
            invoice_number: invoiceNumber.trim() || `INV-${Date.now()}`,
            invoiced_by: invoicedBy,
            invoice_url: invoiceUrl,
        })
        .select()
        .single();

      if (invoiceError) throw new Error(`Fallo al crear factura: ${invoiceError.message}`);

      // 3. Insertar Ítems Facturados
      const invoicedItemInserts = items.map(item => ({
        invoice_id: newInvoice.id,
        request_item_id: item.requestItemId,
        quantity_invoiced: item.quantityInvoiced,
      }));

      const { error: itemsError } = await supabase
        .from('invoiced_items')
        .insert(invoicedItemInserts);

      if (itemsError) throw new Error(`Fallo al insertar ítems facturados: ${itemsError.message}`);

      return newInvoice;
    },
    onSuccess: (newInvoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', newInvoice.request_id] });
      queryClient.invalidateQueries({ queryKey: ['aggregatedInvoicedItems', newInvoice.request_id] });
      toast.success(`Factura ${newInvoice.invoice_number} registrada exitosamente.`);
    },
    onError: (error) => {
      toast.error("Fallo al registrar la facturación.", { description: error.message });
    },
  });
};

export const useDeleteInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (invoiceId: string) => {
            const { data: invoiceData, error: fetchError } = await supabase
                .from('invoices')
                .select('request_id')
                .eq('id', invoiceId)
                .single();
            if (fetchError) throw new Error(fetchError.message);

            const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
            if (error) throw new Error(error.message);
            return { requestId: invoiceData.request_id };
        },
        onSuccess: ({ requestId }) => {
            queryClient.invalidateQueries({ queryKey: ['invoices', requestId] });
            queryClient.invalidateQueries({ queryKey: ['aggregatedInvoicedItems', requestId] });
            toast.success("Factura eliminada.");
        },
        onError: (error) => {
            toast.error("Fallo al eliminar factura.", { description: error.message });
        }
    });
};