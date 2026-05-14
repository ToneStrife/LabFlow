"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useInvoiceItems, useAggregatedInvoicedItems } from "@/hooks/use-invoices";
import { toast } from "sonner";
import FileUploadInput from "../FileUploadInput";

const invoicedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyInvoiced: z.number(),
  quantityInvoiced: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0)
  ),
});

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "El número de factura es obligatorio."),
  items: z.array(invoicedItemSchema).min(1),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceItemsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestItems: SupabaseRequestItem[];
}

const InvoiceItemsDialog: React.FC<InvoiceItemsDialogProps> = ({
  isOpen,
  onOpenChange,
  requestId,
  requestItems,
}) => {
  const { data: aggregatedInvoiced, isLoading: isLoadingInvoiced } = useAggregatedInvoicedItems(requestId);
  const invoiceItemsMutation = useInvoiceItems();
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const initialItems = React.useMemo(() => {
    if (!requestItems || !aggregatedInvoiced) return [];
    return requestItems.map(item => {
      const previouslyInvoiced = aggregatedInvoiced.find(agg => agg.request_item_id === item.id)?.total_invoiced || 0;
      const remaining = item.quantity - previouslyInvoiced;
      return {
        requestItemId: item.id,
        productName: item.product_name,
        quantityOrdered: item.quantity,
        quantityPreviouslyInvoiced: previouslyInvoiced,
        quantityInvoiced: remaining > 0 ? remaining : 0,
      };
    });
  }, [requestItems, aggregatedInvoiced]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { 
      invoiceNumber: "", 
      items: initialItems 
    },
    // Eliminado el bloque 'values' que causaba el ReferenceError al intentar acceder a 'form' antes de ser definido
  });

  // Efecto para actualizar los ítems si cambian los datos agregados
  React.useEffect(() => {
    if (initialItems.length > 0) {
      form.setValue('items', initialItems);
    }
  }, [initialItems, form]);

  const { fields } = useFieldArray({ control: form.control, name: "items" });

  const handleSubmit = async (data: InvoiceFormValues) => {
    const itemsToInvoice = data.items
      .filter(item => item.quantityInvoiced > 0)
      .map(item => ({
        requestItemId: item.requestItemId,
        quantityInvoiced: item.quantityInvoiced,
      }));

    if (itemsToInvoice.length === 0) {
      toast.error("Especifica al menos una cantidad a facturar.");
      return;
    }

    await invoiceItemsMutation.mutateAsync({
      requestId,
      invoiceNumber: data.invoiceNumber,
      file: selectedFile,
      items: itemsToInvoice,
    });

    onOpenChange(false);
    setSelectedFile(null);
    form.reset();
  };

  const handleInvoiceAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map(item => ({
      ...item,
      quantityInvoiced: Math.max(0, item.quantityOrdered - item.quantityPreviouslyInvoiced),
    }));
    form.setValue('items', updatedItems as any);
  };

  if (isLoadingInvoiced) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Registrar Facturación</DialogTitle>
          <DialogDescription>Registra qué artículos se incluyen en esta factura.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura</FormLabel>
                    <FormControl><Input placeholder="ej. FAC-2024-001" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FileUploadInput 
                label="Adjuntar Factura (PDF/Imagen)" 
                onChange={(files) => setSelectedFile(files?.[0] || null)} 
              />
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto p-2 border rounded-md">
              {fields.map((item, index) => {
                const remaining = item.quantityOrdered - item.quantityPreviouslyInvoiced;
                return (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center border-b pb-2 last:border-b-0">
                    <div className="sm:col-span-2">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Pedido: {item.quantityOrdered} | Ya facturado: {item.quantityPreviouslyInvoiced}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Pendiente</p>
                      <p className="font-bold text-orange-600">{remaining}</p>
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityInvoiced`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl><Input type="number" {...field} className="h-8" /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleInvoiceAll}>Facturar Todo lo Pendiente</Button>
              <Button type="submit" disabled={invoiceItemsMutation.isPending}>
                {invoiceItemsMutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Registrar Factura"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceItemsDialog;