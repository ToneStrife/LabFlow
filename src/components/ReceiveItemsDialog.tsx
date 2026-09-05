"use client";

import React, { useCallback } from "react";
import { createPortal } from "react-dom";
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
  X,
  Check,
} from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import FileUploadInput from "@/components/FileUploadInput";
import { cn } from "@/lib/utils";
import { dialogFooterMobileClass, dialogBodyScrollClass } from "@/lib/layout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  compressImageFile,
  dataUrlToFile,
  fileToDataUrl,
  type PersistedSlipFile,
} from "@/utils/image-file";
import {
  ACTIVE_RECEIVE_REQUEST_KEY,
  receiveFlagKey,
  receiveFormKey,
  receiveSlipFileKey,
  receiveStepKey,
} from "@/lib/receive-wizard-storage";

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
  const isMobile = useIsMobile();
  const { data: aggregatedReceived, isLoading: isLoadingReceived } = useAggregatedReceivedItems(requestId);
  const receiveItemsMutation = useReceiveItems();
  const [slipFile, setSlipFile] = React.useState<File | null>(null);
  const [step, setStep] = React.useState<WizardStep>(1);
  // El boton principal ocupa el mismo sitio en los tres pasos, y en el tercero
  // pasa a ser "Confirmar recepcion", que escribe en la base de datos y no se
  // deshace solo. Dos toques seguidos en el mismo punto (o un toque que llega
  // justo despues de redibujar) confirmaban la recepcion sin que nadie hubiera
  // leido el resumen. El boton queda inerte un instante al entrar al paso 3.
  const [confirmacionArmada, setConfirmacionArmada] = React.useState(false);
  const [portalReady, setPortalReady] = React.useState(false);
  const filePickerActiveRef = React.useRef(false);
  const suppressCloseUntilRef = React.useRef(0);
  const PERSIST_KEY = receiveFormKey(requestId);
  const SLIP_FILE_KEY = receiveSlipFileKey(requestId);
  const RECEIVING_FLAG_KEY = receiveFlagKey(requestId);
  const STEP_KEY = receiveStepKey(requestId);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (!isOpen || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, isMobile]);

  React.useEffect(() => {
    if (!isOpen) return;
    const savedStep = Number(sessionStorage.getItem(STEP_KEY));
    if (savedStep === 1 || savedStep === 2 || savedStep === 3) {
      setStep(savedStep as WizardStep);
    } else {
      setStep(1);
    }
  }, [isOpen, requestId, STEP_KEY]);

  React.useEffect(() => {
    if (!isOpen) return;
    sessionStorage.setItem(STEP_KEY, String(step));
  }, [step, isOpen, STEP_KEY]);

  React.useEffect(() => {
    if (step !== 3) {
      setConfirmacionArmada(false);
      return;
    }
    setConfirmacionArmada(false);
    const id = setTimeout(() => setConfirmacionArmada(true), 500);
    return () => clearTimeout(id);
  }, [step]);

  const extendSuppressClose = useCallback((ms: number) => {
    suppressCloseUntilRef.current = Date.now() + ms;
  }, []);

  const shouldBlockClose = useCallback(
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

  // El wizard se mantiene abierto vía ReceiveWizardProvider + sessionStorage
  // (sobrevive a la cámara del móvil sin depender del estado local del padre).

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
        /* ignore quota */
      }
    },
    [SLIP_FILE_KEY]
  );

  const handleSlipFileChange = useCallback(
    (files: FileList | null) => {
      const file = files?.[0] ?? null;
      setSlipFile(file);
      extendSuppressClose(8000);
      void persistSlipFile(file);
    },
    [persistSlipFile, extendSuppressClose]
  );

  const handlePickerActiveChange = useCallback(
    (active: boolean) => {
      filePickerActiveRef.current = active;
      extendSuppressClose(active ? 15000 : 5000);
    },
    [extendSuppressClose]
  );

  const requestClose = useCallback(
    (force = false) => {
      if (!force && shouldBlockClose()) return;
      onOpenChange(false);
    },
    [onOpenChange, shouldBlockClose]
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(PERSIST_KEY);
    sessionStorage.removeItem(SLIP_FILE_KEY);
    sessionStorage.removeItem(RECEIVING_FLAG_KEY);
    sessionStorage.removeItem(STEP_KEY);
    sessionStorage.removeItem(ACTIVE_RECEIVE_REQUEST_KEY);
    setSlipFile(null);
    setStep(1);
  }, [PERSIST_KEY, SLIP_FILE_KEY, RECEIVING_FLAG_KEY, STEP_KEY]);

  const handleSubmit = async (data: ReceiveFormValues) => {
    // Si el envio llega antes de que el boton este armado, viene de un toque
    // heredado del paso anterior, no de una decision.
    if (!confirmacionArmada) return;

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
    onOpenChange(false);
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

  /**
   * Con muchos artículos, lo que todavía no ha llegado quedaba enterrado bajo
   * lo ya recibido. Aquí se pintan primero los pendientes.
   *
   * Importante: esto reordena solo la presentación, no el array del formulario.
   * Cada campo sigue usando su índice original, que es lo que lo ata a su
   * artículo al enviar. Y la clave de orden (lo que falta según lo ya recibido
   * antes de abrir el asistente) no cambia mientras tecleas, así que ninguna
   * tarjeta salta de sitio al escribir una cantidad.
   */
  const ordenDeVisualizacion = React.useMemo(() => {
    const restante = (indice: number) => {
      const original = initialItems[indice];
      return original ? original.quantityOrdered - original.quantityPreviouslyReceived : 0;
    };
    return fields
      .map((item, index) => ({ item, index }))
      .sort((a, b) => (restante(a.index) > 0 ? 0 : 1) - (restante(b.index) > 0 ? 0 : 1));
  }, [fields, initialItems]);

  const stepNav = (
    <nav aria-label="Pasos de recepción" className="flex w-full items-start">
      {STEP_META.map((s, idx) => {
        const Icon = s.icon;
        const active = step === s.id;
        const done = step > s.id;
        return (
          <React.Fragment key={s.id}>
            {idx > 0 && (
              <div className="mt-[15px] h-0.5 min-w-3 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full bg-primary transition-all duration-300",
                    done || active ? "w-full" : "w-0"
                  )}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (s.id < step) setStep(s.id);
              }}
              disabled={s.id > step}
              className="flex shrink-0 flex-col items-center gap-1.5 px-1 disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && !active && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-muted bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );

  const wizardBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className={cn(dialogBodyScrollClass, "space-y-4 py-3 px-1")}>
          {isLoadingReceived ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando...
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border bg-muted/40 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-3 shrink-0">
                        <Camera className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Foto del albarán</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Opcional. Puedes continuar sin foto.
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
                            className="h-12 font-mono text-base"
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
                  <div className="sticky top-0 z-10 space-y-2 bg-background py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="tabular-figures font-mono font-semibold text-foreground">
                          {markedCount}
                        </span>
                        {" / "}
                        <span className="tabular-figures font-mono">
                          {pendingItemCount || fields.length}
                        </span>
                        {" con cantidad"}
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
                    {/* Cuanto queda por marcar, de un vistazo */}
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (markedCount / Math.max(1, pendingItemCount || fields.length)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {ordenDeVisualizacion.map(({ item, index }) => {
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
                          "rounded-xl border p-3 space-y-2.5 transition-colors sm:p-3.5",
                          hasQty && "border-primary/40 bg-primary/5",
                          isFullyReceived && "opacity-60 bg-muted/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug" title={item.productName}>
                              {item.productName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Pedido {quantityOrdered}
                              {quantityPreviouslyReceived > 0 &&
                                ` · Ya recibido ${quantityPreviouslyReceived}`}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular-nums",
                              quantityRemaining <= 0
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            )}
                          >
                            {quantityRemaining <= 0 ? "OK" : `Faltan ${quantityRemaining}`}
                          </div>
                        </div>

                        {!isFullyReceived && (
                          // En escritorio, cantidad y ubicacion comparten fila:
                          // con tres articulos el dialogo se hacia enorme.
                          <div className="grid gap-2.5 sm:grid-cols-2 sm:items-start sm:gap-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantityReceived`}
                              render={({ field: quantityField }) => (
                                <FormItem className="space-y-1.5">
                                  <FormLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Cantidad a recibir
                                  </FormLabel>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                                      onClick={() => adjustQuantity(index, -1)}
                                      disabled={isSubmitting || currentQty <= 0}
                                      aria-label="Restar uno"
                                    >
                                      <Minus className="h-5 w-5" />
                                    </Button>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={quantityRemaining}
                                        {...quantityField}
                                        onChange={(e) => {
                                          const raw = Number(e.target.value);
                                          const capped = Math.max(
                                            0,
                                            Math.min(
                                              quantityRemaining,
                                              Number.isFinite(raw) ? raw : 0
                                            )
                                          );
                                          quantityField.onChange(capped);
                                        }}
                                        disabled={isSubmitting}
                                        className="h-11 min-w-0 text-center font-mono text-lg font-semibold tabular-nums sm:h-9"
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
                                      onClick={() => adjustQuantity(index, 1)}
                                      disabled={isSubmitting || currentQty >= quantityRemaining}
                                      aria-label="Sumar uno"
                                    >
                                      <Plus className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="h-11 shrink-0 px-3 sm:h-9"
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
                                <FormItem className="space-y-1.5">
                                  <FormLabel className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
                                      className="h-11 sm:h-9"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {/* Bloque del albaran: dos datos, leidos de un vistazo */}
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Albarán</h3>
                    </div>
                    <dl className="divide-y">
                      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                        <dt className="text-sm text-muted-foreground">Número</dt>
                        <dd className="truncate font-mono text-sm font-medium">
                          {watchedValues.slipNumber || "—"}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                        <dt className="shrink-0 text-sm text-muted-foreground">Archivo</dt>
                        <dd
                          className={cn(
                            "truncate text-sm",
                            slipFile ? "font-medium" : "text-muted-foreground"
                          )}
                        >
                          {slipFile?.name || "Sin foto"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      Se registrarán {summaryItems.length} artículo
                      {summaryItems.length === 1 ? "" : "s"}
                    </h3>
                    {summaryItems.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                        No hay cantidades marcadas. Vuelve al paso anterior.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border">
                        <ul className="divide-y">
                          {summaryItems.map((item) => (
                            <li
                              key={item.requestItemId}
                              className="flex items-start justify-between gap-3 bg-card p-4"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium leading-snug">{item.productName}</p>
                                {item.storageLocation && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{item.storageLocation}</span>
                                  </p>
                                )}
                              </div>
                              <span className="tabular-figures shrink-0 font-mono text-lg font-bold text-primary">
                                ×{item.quantityReceived}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {/* Cierre de la cuenta, como en un albaran de verdad */}
                        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-4 py-3">
                          <span className="text-sm font-medium">Total de unidades</span>
                          <span className="tabular-figures font-mono text-lg font-bold">
                            {summaryItems.reduce(
                              (total, item) => total + (item.quantityReceived || 0),
                              0
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={cn(
            "shrink-0 flex flex-col gap-2 border-t pt-3 bg-background",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            !isMobile && dialogFooterMobileClass
          )}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (step === 1) {
                clearDraft();
                requestClose(true);
              } else {
                goBack();
              }
            }}
            disabled={isSubmitting}
            className="w-full h-12 text-base"
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
              disabled={isSubmitting || isLoadingReceived}
              className="w-full h-12 text-base"
            >
              {step === 1 ? "Siguiente" : "Revisar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting || summaryItems.length === 0 || !confirmacionArmada}
              className="h-12 w-full bg-emerald-600 text-base text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
        </div>
      </form>
    </Form>
  );

  // —— Móvil: pantalla completa opaca (sin Dialog / sin ver la web detrás) ——
  if (isMobile) {
    if (!isOpen || !portalReady) return null;

    return createPortal(
      <div
        className="fixed inset-0 z-[200] flex flex-col bg-background"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receive-wizard-title"
      >
        <header className="shrink-0 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h1 id="receive-wizard-title" className="text-lg font-bold truncate">
              Recibir paquete
            </h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => {
                if (shouldBlockClose()) return;
                clearDraft();
                requestClose(true);
              }}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {stepNav}
        </header>
        <div className="flex flex-col flex-1 min-h-0 px-4">{wizardBody}</div>
      </div>,
      document.body
    );
  }

  // —— Desktop: dialog clásico ——
  if (!isOpen) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && shouldBlockClose()) return;
        if (!open) {
          // Solo limpia si el usuario cierra de verdad (X), no al sacar foto
          onOpenChange(false);
        } else {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent
        className={cn(
          "!flex !flex-col max-h-[90dvh] overflow-hidden gap-0 p-6 sm:max-w-[720px]"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (shouldBlockClose()) e.preventDefault();
        }}
      >
        <DialogHeader className="shrink-0 pr-8 space-y-3">
          <DialogTitle>Recibir paquete</DialogTitle>
          <DialogDescription className="sr-only">
            Asistente para registrar la recepción de artículos.
          </DialogDescription>
          {stepNav}
        </DialogHeader>
        {wizardBody}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;
