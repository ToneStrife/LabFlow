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
import {
  Loader2,
  CheckCheck,
  Camera,
  Package,
  ClipboardCheck,
  Minus,
  Plus,
  MapPin,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import FileUploadInput from "@/components/FileUploadInput";
import { cn } from "@/lib/utils";
import { mobileDialogClass, dialogFooterMobileClass, dialogBodyScrollClass } from "@/lib/layout";
import {
  compressImageFile,
  dataUrlToFile,
  fileToDataUrl,
  type PersistedSlipFile,
} from "@/utils/image-file";

const receivedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyReceived: z.number(),
  quantityReceived: z.preprocess(
    (val) => Number(val),
    z
      .number()
      .int({ message: "La cantidad debe ser un número entero." })
      .min(0, { message: "La cantidad no puede ser negativa." })
  ),
  storageLocation: z.string().optional().nullable(),
});

const receiveFormSchema = z.object({
  slipNumber: z.string().optional().nullable(),
  items: z.array(receivedItemSchema).min(1),
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;
type WizardStep = 1 | 2 | 3;

const STEP_META: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 1, label: "Albarán", icon: Camera },
  { id: 2, label: "Artículos", icon: Package },
  { id: 3, label: "Confirmar", icon: ClipboardCheck },
];

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
  const [step, setStep] = React.useState<WizardStep>(1);
  const filePickerActiveRef = React.useRef(false);
  const suppressCloseUntilRef = React.useRef(0);
  const reopenAttemptedRef = React.useRef(false);
  const PERSIST_KEY = `receiveItemsForm:${requestId}`;
  const SLIP_FILE_KEY = `receiveItemsSlipFile:${requestId}`;
  const RECEIVING_FLAG_KEY = `receiveItemsReceiving:${requestId}`;

  const [useNonModalDialog, setUseNonModalDialog] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setUseNonModalDialog(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen, requestId]);

  const extendSuppressClose = useCallback((ms: number) => {
    suppressCloseUntilRef.current = Date.now() + ms;
  }, []);

  const shouldBlockDialogClose = useCallback(
    () => filePickerActiveRef.current || Date.now() < suppressCloseUntilRef.current,
    []
  );

  const initialItems = React.useMemo(() => {
    if (!requestItems || !aggregatedReceived) return [];
    return requestItems.map((item) => {
      const previouslyReceived =
        aggregatedReceived.find((agg) => agg.request_item_id === item.id)?.total_received || 0;
      return {
        requestItemId: item.id,
        productName: item.product_name,
        quantityOrdered: item.quantity,
        quantityPreviouslyReceived: previouslyReceived,
        quantityReceived: 0,
        storageLocation: null as string | null,
      };
    });
  }, [requestItems, aggregatedReceived]);

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: { slipNumber: null, items: [] },
  });

  const { fields } = useFieldArray({ control: form.control, name: "items" });
  const watchedValues = useWatch({ control: form.control });
  const [hasRestored, setHasRestored] = React.useState(false);

  React.useEffect(() => {
    if (isLoadingReceived || !initialItems.length || hasRestored) return;

    let slipNumber: string | null = null;
    let items = initialItems;

    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        slipNumber = saved.slipNumber ?? null;
        if (saved.items && Array.isArray(saved.items)) {
          items = initialItems.map((initialItem) => {
            const savedItem = saved.items.find(
              (s: { requestItemId: string; quantityReceived?: number; storageLocation?: string | null }) =>
                s.requestItemId === initialItem.requestItemId
            );
            if (savedItem && savedItem.quantityReceived !== undefined && savedItem.quantityReceived >= 0) {
              return {
                ...initialItem,
                quantityReceived: savedItem.quantityReceived,
                storageLocation: savedItem.storageLocation ?? initialItem.storageLocation,
              };
            }
            return initialItem;
          });
        }
      } catch {
        localStorage.removeItem(PERSIST_KEY);
      }
    }

    form.reset({ slipNumber, items });
    setHasRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialItems, isLoadingReceived]);

  React.useEffect(() => {
    setHasRestored(false);
  }, [requestId]);

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
            storageLocation: item.storageLocation ?? null,
          })),
        })
      );
    }, 500);
    return () => clearTimeout(id);
  }, [watchedValues, PERSIST_KEY, hasRestored]);

  React.useEffect(() => {
    if (!isOpen) return;
    reopenAttemptedRef.current = false;
    sessionStorage.setItem(RECEIVING_FLAG_KEY, "1");
    const raw = sessionStorage.getItem(SLIP_FILE_KEY);
    if (!raw) return;
    try {
      const persisted = JSON.parse(raw) as PersistedSlipFile;
      setSlipFile(dataUrlToFile(persisted));
    } catch {
      sessionStorage.removeItem(SLIP_FILE_KEY);
    }
  }, [isOpen, SLIP_FILE_KEY, RECEIVING_FLAG_KEY]);

  React.useEffect(() => {
    if (isOpen) return;
    const receiving = sessionStorage.getItem(RECEIVING_FLAG_KEY) === "1";
    const hasSlipDraft = Boolean(sessionStorage.getItem(SLIP_FILE_KEY));
    if (!receiving || !hasSlipDraft || reopenAttemptedRef.current) return;
    reopenAttemptedRef.current = true;
    const id = window.setTimeout(() => onOpenChange(true), 80);
    return () => window.clearTimeout(id);
  }, [isOpen, onOpenChange, RECEIVING_FLAG_KEY, SLIP_FILE_KEY]);

  const persistSlipFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        sessionStorage.removeItem(SLIP_FILE_KEY);
        return;
      }
      try {
        const compressed = await compressImageFile(file);
        const dataUrl = await fileToDataUrl(compressed);
        if (dataUrl.length > 4_000_000) return;
        const payload: PersistedSlipFile = {
          name: compressed.name,
          type: compressed.type,
          dataUrl,
        };
        sessionStorage.setItem(SLIP_FILE_KEY, JSON.stringify(payload));
      } catch {
        /* sessionStorage optional */
      }
    },
    [SLIP_FILE_KEY]
  );

  const handleSlipFileChange = useCallback(
    (files: FileList | null) => {
      const file = files?.[0] ?? null;
      setSlipFile(file);
      extendSuppressClose(5000);
      void persistSlipFile(file);
    },
    [persistSlipFile, extendSuppressClose]
  );

  const handlePickerActiveChange = useCallback(
    (active: boolean) => {
      filePickerActiveRef.current = active;
      extendSuppressClose(active ? 10000 : 4000);
    },
    [extendSuppressClose]
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open && shouldBlockDialogClose()) return;
      onOpenChange(open);
    },
    [onOpenChange, shouldBlockDialogClose]
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(PERSIST_KEY);
    sessionStorage.removeItem(SLIP_FILE_KEY);
    sessionStorage.removeItem(RECEIVING_FLAG_KEY);
    setSlipFile(null);
    setStep(1);
  }, [PERSIST_KEY, SLIP_FILE_KEY, RECEIVING_FLAG_KEY]);

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
          storageLocation: item.storageLocation?.trim() || null,
          itemDetails: orderedItem,
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error("Marca al menos un artículo con cantidad mayor que 0.");
      setStep(2);
      return;
    }

    await receiveItemsMutation.mutateAsync({
      requestId,
      slipNumber: data.slipNumber || "",
      file: slipFile ?? undefined,
      items: itemsToReceive,
    });
    clearDraft();
    handleDialogOpenChange(false);
  };

  const handleReceiveAll = () => {
    const updatedItems = form.getValues("items").map((item) => {
      const quantityRemaining = item.quantityOrdered - item.quantityPreviouslyReceived;
      return { ...item, quantityReceived: quantityRemaining > 0 ? quantityRemaining : 0 };
    });
    form.setValue("items", updatedItems as ReceiveFormValues["items"], { shouldDirty: true });
  };

  const handleReceiveAllAndGoToSummary = () => {
    if (allItemsFullyReceived) {
      toast.info("Todos los artículos ya han sido recibidos completamente.");
      return;
    }
    handleReceiveAll();
    setStep(3);
  };

  const adjustQuantity = (index: number, delta: number) => {
    const item = form.getValues(`items.${index}`);
    const remaining = item.quantityOrdered - item.quantityPreviouslyReceived;
    const next = Math.max(0, Math.min(remaining > 0 ? remaining : 0, (item.quantityReceived || 0) + delta));
    form.setValue(`items.${index}.quantityReceived`, next, { shouldDirty: true });
  };

  const setRemaining = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const remaining = item.quantityOrdered - item.quantityPreviouslyReceived;
    if (remaining > 0) {
      form.setValue(`items.${index}.quantityReceived`, remaining, { shouldDirty: true });
    }
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const marked = form.getValues("items").filter((i) => i.quantityReceived > 0).length;
      if (marked === 0) {
        toast.error("Indica la cantidad de al menos un artículo.");
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const dialogClass = cn(mobileDialogClass, "sm:max-w-[640px] gap-0 p-4 sm:p-6");

  if (isLoadingReceived) {
    return (
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange} modal={!useNonModalDialog}>
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
  const watchedItems = watchedValues.items || [];
  const markedCount = watchedItems.filter((i) => (i.quantityReceived || 0) > 0).length;
  const pendingItemCount = initialItems.filter(
    (i) => i.quantityOrdered - i.quantityPreviouslyReceived > 0
  ).length;
  const summaryItems = watchedItems.filter((i) => (i.quantityReceived || 0) > 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange} modal={!useNonModalDialog}>
      <DialogContent
        className={dialogClass}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onFocusOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 pr-8 space-y-3">
          <DialogTitle className="text-base sm:text-lg">Recibir paquete</DialogTitle>
          <DialogDescription className="sr-only">
            Asistente para registrar la recepción de artículos.
          </DialogDescription>

          <nav aria-label="Pasos de recepción" className="flex items-center gap-1 sm:gap-2">
            {STEP_META.map((s, idx) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 rounded-full min-w-2",
                        done || active ? "bg-primary" : "bg-muted"
                      )}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (s.id < step) setStep(s.id);
                    }}
                    disabled={s.id > step}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0",
                      active && "bg-primary text-primary-foreground",
                      done && !active && "bg-primary/15 text-primary",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </DialogHeader>

        <Form {...form}>
          <div className="flex flex-col flex-1 min-h-0">
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className={cn(dialogBodyScrollClass, "space-y-4 py-3")}>
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="rounded-xl border bg-muted/30 p-4 sm:p-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                          <Camera className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">Foto del albarán</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Opcional. Puedes saltar este paso si no tienes el documento a mano.
                          </p>
                        </div>
                      </div>
                      <FileUploadInput
                        label="Adjuntar albarán"
                        accept="image/*,application/pdf"
                        capture="environment"
                        compressImages
                        onPickerActiveChange={handlePickerActiveChange}
                        onChange={handleSlipFileChange}
                        disabled={isSubmitting}
                        currentFileMeta={slipFile ? { name: slipFile.name, size: slipFile.size } : null}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="slipNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de albarán (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ej. SLIP-12345"
                              {...field}
                              disabled={isSubmitting}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value || null)}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-1">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{markedCount}</span>
                        {" / "}
                        {pendingItemCount || fields.length} con cantidad
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleReceiveAllAndGoToSummary}
                        disabled={isSubmitting || allItemsFullyReceived}
                      >
                        <CheckCheck className="h-4 w-4" />
                        Recibir todo
                      </Button>
                    </div>

                    {fields.map((item, index) => {
                      const quantityOrdered = form.watch(`items.${index}.quantityOrdered`);
                      const quantityPreviouslyReceived = form.watch(
                        `items.${index}.quantityPreviouslyReceived`
                      );
                      const quantityRemaining = quantityOrdered - quantityPreviouslyReceived;
                      const isFullyReceived = quantityRemaining <= 0 && quantityPreviouslyReceived > 0;
                      const currentQty = form.watch(`items.${index}.quantityReceived`) || 0;
                      const hasQty = currentQty > 0;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "rounded-xl border p-4 space-y-3 transition-colors",
                            hasQty && "border-primary/40 bg-primary/5",
                            isFullyReceived && "opacity-60 bg-muted/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium leading-snug" title={item.productName}>
                                {item.productName}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Pedido {quantityOrdered}
                                {quantityPreviouslyReceived > 0 &&
                                  ` · Ya recibido ${quantityPreviouslyReceived}`}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "text-sm font-bold tabular-nums shrink-0 rounded-md px-2 py-1",
                                quantityRemaining <= 0
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-800"
                              )}
                            >
                              {quantityRemaining <= 0 ? "OK" : `Faltan ${quantityRemaining}`}
                            </div>
                          </div>

                          {!isFullyReceived && (
                            <>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantityReceived`}
                                render={({ field: quantityField }) => (
                                  <FormItem className="space-y-2">
                                    <FormLabel className="text-xs text-muted-foreground">
                                      Cantidad a recibir
                                    </FormLabel>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11 shrink-0"
                                        onClick={() => adjustQuantity(index, -1)}
                                        disabled={isSubmitting || currentQty <= 0}
                                        aria-label="Restar uno"
                                      >
                                        <Minus className="h-5 w-5" />
                                      </Button>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={quantityRemaining}
                                          {...quantityField}
                                          onChange={(e) => {
                                            const raw = Number(e.target.value);
                                            const capped = Math.max(
                                              0,
                                              Math.min(quantityRemaining, Number.isFinite(raw) ? raw : 0)
                                            );
                                            quantityField.onChange(capped);
                                          }}
                                          disabled={isSubmitting}
                                          className="h-11 text-center text-lg font-semibold tabular-nums"
                                        />
                                      </FormControl>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-11 w-11 shrink-0"
                                        onClick={() => adjustQuantity(index, 1)}
                                        disabled={isSubmitting || currentQty >= quantityRemaining}
                                        aria-label="Sumar uno"
                                      >
                                        <Plus className="h-5 w-5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="h-11 shrink-0 px-3"
                                        onClick={() => setRemaining(index)}
                                        disabled={
                                          isSubmitting ||
                                          quantityRemaining <= 0 ||
                                          currentQty === quantityRemaining
                                        }
                                      >
                                        Todo
                                      </Button>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`items.${index}.storageLocation`}
                                render={({ field: locationField }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> Ubicación (opcional)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="ej. Nevera 2 / Estantería B"
                                        {...locationField}
                                        value={locationField.value || ""}
                                        onChange={(e) =>
                                          locationField.onChange(e.target.value || null)
                                        }
                                        disabled={isSubmitting}
                                        className="h-10"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Albarán
                      </h3>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Número: </span>
                        {watchedValues.slipNumber || "—"}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Archivo: </span>
                        {slipFile?.name || "Sin foto"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">
                        Se registrarán {summaryItems.length} artículo
                        {summaryItems.length === 1 ? "" : "s"}
                      </h3>
                      {summaryItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
                          No hay cantidades marcadas. Vuelve al paso anterior.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-xl border overflow-hidden">
                          {summaryItems.map((item) => (
                            <li
                              key={item.requestItemId}
                              className="flex items-start justify-between gap-3 p-3 bg-card"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-sm leading-snug">{item.productName}</p>
                                {item.storageLocation && (
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.storageLocation}
                                  </p>
                                )}
                              </div>
                              <span className="font-bold tabular-nums text-primary shrink-0">
                                ×{item.quantityReceived}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className={dialogFooterMobileClass}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (step === 1) {
                      clearDraft();
                      handleDialogOpenChange(false);
                    } else {
                      goBack();
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {step === 1 ? (
                    "Cancelar"
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4" /> Atrás
                    </>
                  )}
                </Button>

                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {step === 1 ? "Continuar" : "Revisar"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || summaryItems.length === 0}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="h-4 w-4" /> Confirmar recepción
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;
