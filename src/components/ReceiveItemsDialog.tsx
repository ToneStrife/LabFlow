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
import { Loader2, CheckSquare, CheckCheck } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import FileUploadInput from "./FileUploadInput"; // Importar el nuevo componente

// Esquema para la cantidad recibida de un ítem
const receivedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyReceived: z.number(),
  quantityReceived: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "La cantidad debe ser no negativa." })
  ),
});

// Esquema principal del formulario
const receiveFormSchema = z.object({
  slipNumber: z.string().optional(), // Opcional
  slipFile: z.any().optional(), // Ahora maneja FileList o null
  items: z.array(receivedItemSchema).min(1),
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;

interface ReceiveItemsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestItems: SupabaseRequestItem[];
}

const ReceiveItemsDialog: React.FC<ReceiveItemsDialogProps> = ({
  isOpen,
  onOpenChange,
  requestId,
  requestItems,
}) => {
  const { data: aggregatedReceived, isLoading: isLoadingReceived } = useAggregatedReceivedItems(requestId);
  const receiveItemsMutation = useReceiveItems();
  
  const initialItems = React.useMemo(() => {
    if (!requestItems || !aggregatedReceived) return [];

    return requestItems.map(item => {
      const previouslyReceived = aggregatedReceived.find(agg => agg.request_item_id === item.id)?.total_received || 0;
      const remaining = item.quantity - previouslyReceived;

      return {
        requestItemId: item.id,
        productName: item.product_name,
        quantityOrdered: item.quantity,
        quantityPreviouslyReceived: previouslyReceived,
        quantityReceived: remaining > 0 ? remaining : 0, // Sugerir la cantidad restante
      };
    });
  }, [requestItems, aggregatedReceived]);

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      slipNumber: "",
      slipFile: undefined,
      items: initialItems,
    },
    values: { // Usar values para resetear cuando cambian las dependencias
      slipNumber: "",
      slipFile: undefined,
      items: initialItems,
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = async (data: ReceiveFormValues) => {
    const itemsToReceive = data.items
      .filter(item => item.quantityReceived > 0)
      .map(item => {
        const orderedItem = requestItems.find(ri => ri.id === item.requestItemId);
        if (!orderedItem) throw new Error(`Item ${item.requestItemId} not found.`);
        
        const totalReceived = item.quantityPreviouslyReceived + item.quantityReceived;
        if (totalReceived > item.quantityOrdered) {
          toast.error(`Error: La cantidad recibida para ${item.productName} excede la cantidad pedida.`);
          throw new Error("Quantity received exceeds quantity ordered.");
        }

        return {
          requestItemId: item.requestItemId,
          quantityReceived: item.quantityReceived,
          itemDetails: orderedItem,
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error("Por favor, especifica al menos una cantidad de artículo mayor a cero para recibir.");
      return;
    }

    // Extraer el archivo del FileList/Array (si existe)
    const file = data.slipFile?.[0] || null;

    await receiveItemsMutation.mutateAsync({
      requestId,
      slipNumber: data.slipNumber || '', // Enviar cadena vacía si es null/undefined
      slipFile: file,
      items: itemsToReceive,
    });

    onOpenChange(false);
  };

  const handleReceiveAll = () => {
    const currentItems = form.getValues('items');
    const updatedItems = currentItems.map(item => {
      const quantityRemaining = item.quantityOrdered - item.quantityPreviouslyReceived;
      return {
        ...item,
        quantityReceived: quantityRemaining > 0 ? quantityRemaining : 0,
      };
    });
    form.setValue('items', updatedItems, { shouldDirty: true });
  };
  
  const handleReceiveAllAndSubmit = () => {
    if (allItemsFullyReceived) {
      toast.info("Todos los artículos ya han sido recibidos completamente.");
      return;
    }
    
    // 1. Set all remaining quantities
    handleReceiveAll();
    
    // 2. Submit the form
    // Usamos setTimeout para asegurar que React Hook Form haya procesado el setValue antes de enviar.
    setTimeout(() => {
      form.handleSubmit(handleSubmit)();
    }, 0);
  };

  const handleReceiveRemaining = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const quantityRemaining = item.quantityOrdered - item.quantityPreviouslyReceived;
    if (quantityRemaining > 0) {
      form.setValue(`items.${index}.quantityReceived`, quantityRemaining, { shouldDirty: true });
      toast.info(`Recibidas ${quantityRemaining} unidades restantes de ${item.productName}.`);
    }
  };

  if (isLoadingReceived) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando estado de recepción...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isSubmitting = receiveItemsMutation.isPending;
  const allItemsFullyReceived = initialItems.every(item => item.quantityOrdered - item.quantityPreviouslyReceived <= 0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Recibir Artículos y Registrar Albarán</DialogTitle>
          <DialogDescription>
            Introduce los detalles del albarán y la cantidad recibida para cada artículo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="slipNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Albarán (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ej. SLIP-12345" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slipFile"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <FileUploadInput 
                        label="Subir Archivo de Albarán (Opcional)"
                        onChange={field.onChange} 
                        disabled={isSubmitting} 
                        accept="image/*,application/pdf"
                        // No pasamos currentFile ya que el formulario solo almacena FileList/Array
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Artículos a Recibir</h3>
              
              {fields.map((item, index) => {
                const quantityOrdered = form.watch(`items.${index}.quantityOrdered`);
                const quantityPreviouslyReceived = form.watch(`items.${index}.quantityPreviouslyReceived`);
                const quantityRemaining = quantityOrdered - quantityPreviouslyReceived;
                const isFullyReceived = quantityRemaining <= 0;
                const currentQuantityReceived = form.watch(`items.${index}.quantityReceived`);

                return (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center border-b pb-3 last:border-b-0">
                    <div className="sm:col-span-2">
                      <p className="font-medium truncate" title={item.productName}>{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Pedido: {quantityOrdered} | Recibido: {quantityPreviouslyReceived}</p>
                    </div>
                    <div className="sm:col-span-1">
                      <p className="text-sm text-muted-foreground">Restante:</p>
                      <p className={`font-bold ${isFullyReceived ? 'text-green-600' : 'text-orange-600'}`}>{quantityRemaining}</p>
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityReceived`}
                      render={({ field: quantityField }) => (
                        <FormItem className="sm:col-span-2 flex items-end space-y-0 gap-2">
                          <div className="flex-1">
                            <FormLabel>Cantidad a Recibir</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={0}
                                max={quantityRemaining}
                                {...quantityField} 
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  quantityField.onChange(val);
                                }}
                                disabled={isSubmitting || isFullyReceived}
                                className={isFullyReceived ? "bg-green-50/50" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </div>
                          
                          {/* Botón de Recibir Restante (Tick) */}
                          {quantityRemaining > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleReceiveRemaining(index)}
                              disabled={isSubmitting || currentQuantityReceived === quantityRemaining}
                              title="Recibir Cantidad Restante"
                            >
                              <CheckSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleReceiveAllAndSubmit} 
                disabled={isSubmitting || allItemsFullyReceived}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando Todo...
                  </>
                ) : (
                  <>
                    <CheckCheck className="mr-2 h-4 w-4" /> Recibir Todo y Registrar
                  </>
                )}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  "Registrar Recepción"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;