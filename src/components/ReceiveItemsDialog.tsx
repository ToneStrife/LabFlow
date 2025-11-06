"use client";

import React, { useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { Loader2, CheckSquare, CheckCheck, Info } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

// Esquema para la cantidad recibida de un ítem
const receivedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyReceived: z.number(),
  quantityReceived: z.preprocess(
    (val) => Number(val),
    // Permitir números negativos para correcciones, la validación de lógica se hace en handleSubmit
    z.number() 
  ),
});

// Esquema principal del formulario
const receiveFormSchema = z.object({
  slipNumber: z.string().optional().nullable(), // Ahora opcional/nullable
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
  
  const PERSIST_KEY = `receiveItemsForm:${requestId}`;
  
  // Eliminamos el estado de archivos seleccionados
  
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
      slipNumber: null, // Inicializar como null
      items: initialItems,
    },
    values: { 
      slipNumber: null, // Inicializar como null
      items: initialItems,
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // --- Lógica de Persistencia ---
  const watchedValues = useWatch({ control: form.control });
  const [hasRestored, setHasRestored] = React.useState(false);
  
  // 1. Restaurar estado al montar (o cuando cambie initialItems)
  React.useEffect(() => {
    if (isLoadingReceived || hasRestored) return;
    
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        
        // Restaurar slipNumber
        form.setValue('slipNumber', saved.slipNumber ?? null);
        
        // Restaurar cantidades recibidas
        if (saved.items && Array.isArray(saved.items)) {
          const updatedItems = initialItems.map(initialItem => {
            const savedItem = saved.items.find((s: any) => s.requestItemId === initialItem.requestItemId);
            if (savedItem && savedItem.quantityReceived !== undefined) {
              return { ...initialItem, quantityReceived: savedItem.quantityReceived };
            }
            return initialItem;
          });
          form.setValue('items', updatedItems as any, { shouldDirty: true });
        }
        
        setHasRestored(true);
      } catch (e) {
        console.error("Failed to restore receive items form state:", e);
        localStorage.removeItem(PERSIST_KEY);
      }
    } else {
        setHasRestored(true); // Marcar como restaurado incluso si no había datos
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems, isLoadingReceived]); // Dependencias: initialItems y loading

  // 2. Autosave (guardar solo slipNumber y quantityReceived de los items)
  React.useEffect(() => {
    if (!hasRestored) return;
    
    const id = setTimeout(() => {
      const dataToSave = {
        slipNumber: watchedValues.slipNumber,
        items: watchedValues.items?.map(item => ({
          requestItemId: item.requestItemId,
          quantityReceived: item.quantityReceived,
        })),
      };
      localStorage.setItem(PERSIST_KEY, JSON.stringify(dataToSave));
    }, 500);
    return () => clearTimeout(id);
  }, [watchedValues, PERSIST_KEY, hasRestored]);
  
  // 3. Limpiar borrador al cerrar si se ha enviado
  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(PERSIST_KEY);
  }, [PERSIST_KEY]);
  
  // --- Fin Lógica de Persistencia ---


  const handleSubmit = async (data: ReceiveFormValues) => {
    const itemsToReceive = data.items
      .filter(item => item.quantityReceived !== 0) // Permitir 0, pero filtrar para el envío
      .map(item => {
        const orderedItem = requestItems.find(ri => ri.id === item.requestItemId);
        if (!orderedItem) throw new Error(`Item ${item.requestItemId} not found.`);
        
        const totalReceived = item.quantityPreviouslyReceived + item.quantityReceived;
        
        // Validación de cantidad total recibida (no puede ser negativa)
        if (totalReceived < 0) {
             toast.error(`Error: La corrección para ${item.productName} resultaría en una cantidad recibida negativa (${totalReceived}).`);
             throw new Error("Correction results in negative received quantity.");
        }
        
        // Advertir si la cantidad total recibida excede la cantidad pedida (solo si es una adición positiva)
        if (totalReceived > item.quantityOrdered && item.quantityReceived > 0) {
          toast.error(`Error: La cantidad total recibida para ${item.productName} excede la cantidad pedida (${totalReceived} > ${item.quantityOrdered}).`);
          throw new Error("Quantity received exceeds quantity ordered.");
        }
        
        return {
          requestItemId: item.requestItemId,
          quantityReceived: item.quantityReceived,
          itemDetails: orderedItem,
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error("Por favor, especifica al menos una cantidad de artículo (positiva o negativa) para registrar.");
      return;
    }

    await receiveItemsMutation.mutateAsync({
      requestId,
      slipNumber: data.slipNumber || "", // Pasar cadena vacía si es null
      items: itemsToReceive,
    });

    clearDraft(); // Limpiar borrador al enviar
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
    form.setValue('items', updatedItems as any, { shouldDirty: true });
  };
  
  const handleReceiveAllAndSubmit = () => {
    if (allItemsFullyReceived) {
      toast.info("Todos los artículos ya han sido recibidos completamente.");
      return;
    }
    
    // 1. Set all remaining quantities
    handleReceiveAll();
    
    // 2. Submit the form
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
      <DialogContent 
        className="sm:max-w-[800px]"
        // CRÍTICO: Prevenir el cierre al hacer clic fuera
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registrar Recepción de Artículos</DialogTitle>
          <DialogDescription>
            Introduce el número de albarán (opcional) y la cantidad recibida para cada artículo.
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
                      <Input 
                        placeholder="ej. SLIP-12345" 
                        {...field} 
                        disabled={isSubmitting} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Corrección de Errores</Label>
                <div className="flex items-center p-3 border rounded-md bg-red-50 text-red-700">
                    <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                    <p className="text-xs">Para corregir una recepción errónea, introduce una cantidad negativa (ej. -1) en la casilla correspondiente.</p>
                </div>
              </div>
            </div>
            
            {/* Eliminamos la lista de archivos seleccionados */}

            <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 border rounded-md">
              <h3 className="text-lg font-semibold mb-4">Artículos a Recibir</h3>
              
              {fields.map((item, index) => {
                const quantityOrdered = form.watch(`items.${index}.quantityOrdered`);
                const quantityPreviouslyReceived = form.watch(`items.${index}.quantityPreviouslyReceived`);
                const quantityRemaining = quantityOrdered - quantityPreviouslyReceived;
                const isFullyReceived = quantityRemaining <= 0 && quantityPreviouslyReceived > 0;
                const currentQuantityReceived = form.watch(`items.${index}.quantityReceived`);

                return (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center border-b pb-3 last:border-b-0">
                    <div className="sm:col-span-2">
                      <p className="font-medium truncate" title={item.productName}>{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Pedido: {quantityOrdered} | Recibido: {quantityPreviouslyReceived}</p>
                    </div>
                    <div className="sm:col-span-1">
                      <p className="text-sm text-muted-foreground">Restante:</p>
                      <p className={`font-bold ${quantityRemaining <= 0 ? 'text-green-600' : 'text-orange-600'}`}>{quantityRemaining}</p>
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityReceived`}
                      render={({ field: quantityField }) => (
                        <FormItem className="sm:col-span-2 flex items-end space-y-0 gap-2">
                          <div className="flex-1">
                            <FormLabel>Cantidad a Registrar</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                // Eliminamos el atributo min para permitir negativos
                                {...quantityField} 
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  quantityField.onChange(val);
                                }}
                                disabled={isSubmitting}
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