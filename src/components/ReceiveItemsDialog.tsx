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
import { Loader2, CheckSquare, CheckCheck, Info, List } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import FileUploadInput from "@/components/FileUploadInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { mobileDialogClass, dialogFooterMobileClass, dialogBodyScrollClass } from "@/lib/layout";

const receivedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyReceived: z.number(),
  quantityReceived: z.preprocess(
    (val) => Number(val),
    z.number().int({ message: "La cantidad debe ser un número entero." }).min(0, { message: "La cantidad no puede ser negativa." })
  ),
});

const receiveFormSchema = z.object({
  slipNumber: z.string().optional().nullable(),
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
  const [slipFile, setSlipFile] = React.useState<File | null>(null);
  const PERSIST_KEY = `receiveItemsForm:${requestId}`;

  const initialItems = React.useMemo(() => {
    if (!requestItems || !aggregatedReceived) return [];
    return requestItems.map((item) => {
      const previouslyReceived = aggregatedReceived.find((agg) => agg.request_item_id === item.id)?.total_received || 0;
      const remaining = item.quantity - previouslyReceived;
      return {
        requestItemId: item.id,
        productName: item.product_name,
        quantityOrdered: item.quantity,
        quantityPreviouslyReceived: previouslyReceived,
        quantityReceived: remaining > 0 ? remaining : 0,
      };
    });
  }, [requestItems, aggregatedReceived]);

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: { slipNumber: null, items: initialItems },
    values: { slipNumber: null, items: initialItems },
  });

  const { fields } = useFieldArray({ control: form.control, name: "items" });
  const watchedValues = useWatch({ control: form.control });
  const [hasRestored, setHasRestored] = React.useState(false);

  React.useEffect(() => {
    if (isLoadingReceived || hasRestored) return;
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        form.setValue("slipNumber", saved.slipNumber ?? null);
        if (saved.items && Array.isArray(saved.items)) {
          const updatedItems = initialItems.map((initialItem) => {
            const savedItem = saved.items.find(
              (s: { requestItemId: string; quantityReceived?: number }) => s.requestItemId === initialItem.requestItemId
            );
            if (savedItem && savedItem.quantityReceived !== undefined && savedItem.quantityReceived >= 0) {
              return { ...initialItem, quantityReceived: savedItem.quantityReceived };
            }
            return initialItem;
          });
          form.setValue("items", updatedItems as ReceiveFormValues["items"], { shouldDirty: true });
        }
        setHasRestored(true);
      } catch {
        localStorage.removeItem(PERSIST_KEY);
      }
    } else {
      setHasRestored(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems, isLoadingReceived]);

  React.useEffect(() => {
    if (!hasRestored) return;
    const id = setTimeout(() => {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          slipNumber: watchedValues.slipNumber,
          items: watchedValues.items?.map((item) => ({
            requestItemId: item.requestItemId,
            quantityReceived: item.quantityReceived,
          })),
        })
      );
    }, 500);
    return () => clearTimeout(id);
  }, [watchedValues, PERSIST_KEY, hasRestored]);

  React.useEffect(() => {
    if (!isOpen) setSlipFile(null);
  }, [isOpen]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(PERSIST_KEY);
    setSlipFile(null);
  }, [PERSIST_KEY]);

  const handleSubmit = async (data: ReceiveFormValues) => {
    const itemsToReceive = data.items
      .filter((item) => item.quantityReceived > 0)
      .map((item) => {
        const orderedItem = requestItems.find((ri) => ri.id === item.requestItemId);
        if (!orderedItem) throw new Error(`Item ${item.requestItemId} not found.`);
        const totalReceived = item.quantityPreviouslyReceived + item.quantityReceived;
        if (totalReceived > item.quantityOrdered) {
          toast.error(
            `Error: La cantidad total recibida para ${item.productName} excede la cantidad pedida (${totalReceived} > ${item.quantityOrdered}).`
          );
          throw new Error("Quantity received exceeds quantity ordered.");
        }
        return {
          requestItemId: item.requestItemId,
          quantityReceived: item.quantityReceived,
          itemDetails: orderedItem,
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error("Por favor, especifica al menos una cantidad de artículo positiva para registrar.");
      return;
    }

    await receiveItemsMutation.mutateAsync({
      requestId,
      slipNumber: data.slipNumber || "",
      file: slipFile ?? undefined,
      items: itemsToReceive,
    });
    clearDraft();
    onOpenChange(false);
  };

  const handleReceiveAll = () => {
    const updatedItems = form.getValues("items").map((item) => {
      const quantityRemaining = item.quantityOrdered - item.quantityPreviouslyReceived;
      return { ...item, quantityReceived: quantityRemaining > 0 ? quantityRemaining : 0 };
    });
    form.setValue("items", updatedItems as ReceiveFormValues["items"], { shouldDirty: true });
  };

  const handleReceiveAllAndSubmit = () => {
    if (allItemsFullyReceived) {
      toast.info("Todos los artículos ya han sido recibidos completamente.");
      return;
    }
    handleReceiveAll();
    setTimeout(() => form.handleSubmit(handleSubmit)(), 0);
  };

  const handleReceiveRemaining = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const quantityRemaining = item.quantityOrdered - item.quantityPreviouslyReceived;
    if (quantityRemaining > 0) {
      form.setValue(`items.${index}.quantityReceived`, quantityRemaining, { shouldDirty: true });
      toast.info(`Recibidas ${quantityRemaining} unidades restantes de ${item.productName}.`);
    }
  };

  const dialogClass = cn(mobileDialogClass, "sm:max-w-[800px] gap-0 p-4 sm:p-6");

  if (isLoadingReceived) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className={dialogClass}>
          <div className="flex justify-center items-center h-40 shrink-0">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando estado de recepción...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isSubmitting = receiveItemsMutation.isPending;
  const allItemsFullyReceived = initialItems.every(
    (item) => item.quantityOrdered - item.quantityPreviouslyReceived <= 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={dialogClass} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="text-base sm:text-lg">Registrar Recepción de Artículos</DialogTitle>
          <DialogDescription className="text-sm">
            Número y/o foto del albarán (opcional) y cantidad recibida por artículo.
          </DialogDescription>
          <p className="text-xs text-blue-700 flex items-start gap-1.5 sm:hidden pt-1">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              ¿Corregir una recepción? Usa el botón <List className="inline h-3 w-3 mx-0.5" /> en el albarán.
            </span>
          </p>
        </DialogHeader>

        <Form {...form}>
          <div className="flex flex-col flex-1 min-h-0">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className={cn(dialogBodyScrollClass, "space-y-4 py-2")}>
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

                <FileUploadInput
                  label="Foto o archivo del albarán (opcional)"
                  accept="image/*,application/pdf"
                  capture="environment"
                  compact
                  onChange={(files) => setSlipFile(files?.[0] ?? null)}
                  disabled={isSubmitting}
                  currentFileMeta={slipFile ? { name: slipFile.name, size: slipFile.size } : null}
                />

                <div className="hidden md:block space-y-2">
                  <Label className="text-sm font-medium">Corrección de Errores</Label>
                  <div className="flex items-center p-3 border rounded-md bg-blue-50 text-blue-700">
                    <Info className="h-4 w-4 mr-2 flex-shrink-0" />
                    <p className="text-xs">
                      Para corregir una recepción, usa el botón <List className="inline h-3 w-3 mx-1" /> en el albarán correspondiente.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base sm:text-lg font-semibold">Artículos a Recibir</h3>
                  {fields.map((item, index) => {
                    const quantityOrdered = form.watch(`items.${index}.quantityOrdered`);
                    const quantityPreviouslyReceived = form.watch(`items.${index}.quantityPreviouslyReceived`);
                    const quantityRemaining = quantityOrdered - quantityPreviouslyReceived;
                    const isFullyReceived = quantityRemaining <= 0 && quantityPreviouslyReceived > 0;
                    const currentQuantityReceived = form.watch(`items.${index}.quantityReceived`);

                    return (
                      <div key={item.id} className="rounded-lg border p-3 space-y-3 bg-card">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate" title={item.productName}>
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Pedido: {quantityOrdered} | Recibido: {quantityPreviouslyReceived}
                            </p>
                          </div>
                          <p className="text-sm shrink-0">
                            <span className="text-muted-foreground">Restante: </span>
                            <span className={cn("font-bold", quantityRemaining <= 0 ? "text-green-600" : "text-orange-600")}>
                              {quantityRemaining}
                            </span>
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantityReceived`}
                          render={({ field: quantityField }) => (
                            <FormItem className="space-y-2">
                              <FormLabel>Cantidad a Registrar</FormLabel>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <FormControl className="flex-1 min-w-0">
                                  <Input
                                    type="number"
                                    min={0}
                                    {...quantityField}
                                    onChange={(e) => quantityField.onChange(Number(e.target.value))}
                                    disabled={isSubmitting}
                                    className={isFullyReceived ? "bg-green-50/50" : ""}
                                  />
                                </FormControl>
                                {quantityRemaining > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size={undefined}
                                    onClick={() => handleReceiveRemaining(index)}
                                    disabled={isSubmitting || currentQuantityReceived === quantityRemaining}
                                    className="w-full sm:w-10 sm:px-0 shrink-0"
                                    title="Recibir Cantidad Restante"
                                  >
                                    <CheckSquare className="h-4 w-4" />
                                    <span className="ml-2 sm:sr-only">Recibir restante</span>
                                  </Button>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className={dialogFooterMobileClass}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReceiveAllAndSubmit}
                  disabled={isSubmitting || allItemsFullyReceived}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando Todo...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="mr-2 h-4 w-4 shrink-0" />
                      <span className="sm:hidden">Recibir todo</span>
                      <span className="hidden sm:inline">Recibir Todo y Registrar</span>
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
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
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;
