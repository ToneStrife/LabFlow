"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Check, ChevronsUpDown, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ProductDetails, RequestItem } from "@/data/types";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { useSession } from "@/components/SessionContextProvider";
import { useVendors } from "@/hooks/use-vendors";
import { useAddRequest } from "@/hooks/use-requests";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { getFullName } from "@/hooks/use-profiles";
import { apiSearchExternalProduct } from "@/integrations/api";
import { debounce } from "lodash-es";

const itemSchema = z.object({
  productName: z.string().min(1, { message: "El nombre del producto es obligatorio." }),
  catalogNumber: z.string().min(1, { message: "El número de catálogo es obligatorio." }),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: "La cantidad debe ser al menos 1." })
  ),
  unitPrice: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, { message: "El precio unitario no puede ser negativo." }).optional()
  ),
  format: z.string().optional(),
  link: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal("")),
  notes: z.string().optional(),
  brand: z.string().optional(),
  // AI-enriched fields (these will now be directly updated into the main fields)
  ai_enriched_product_name: z.string().optional(),
  ai_enriched_pack_size: z.string().optional(),
  ai_enriched_estimated_price: z.number().optional(),
  ai_enriched_link: z.string().optional(),
  ai_enriched_notes: z.string().optional(),
});

const formSchema = z.object({
  vendorId: z.string().min(1, { message: "El proveedor es obligatorio." }),
  requesterId: z.string().min(1, { message: "El ID del solicitante es obligatorio." }), 
  accountManagerId: z.string().optional(), 
  items: z.array(itemSchema).min(1, { message: "Se requiere al menos un artículo." }),
  attachments: z.any().optional(),
  projectCodes: z.array(z.string()).optional(),
});

type RequestFormValues = z.infer<typeof formSchema>;

const RequestForm: React.FC = () => {
  const { session, profile } = useSession();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const addRequestMutation = useAddRequest();

  const [enrichingIndex, setEnrichingIndex] = React.useState<number | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      requesterId: session?.user?.id || "",
      accountManagerId: "unassigned",
      items: [{ 
        productName: "", 
        catalogNumber: "", 
        quantity: 1, 
        unitPrice: undefined, 
        format: "", 
        link: "", 
        notes: "", 
        brand: "",
        ai_enriched_product_name: undefined,
        ai_enriched_pack_size: undefined,
        ai_enriched_estimated_price: undefined,
        ai_enriched_link: undefined,
        ai_enriched_notes: undefined,
      }],
      projectCodes: [],
    },
  });

  React.useEffect(() => {
    if (session?.user?.id) {
      form.setValue("requesterId", session.user.id);
    }
  }, [session, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleAutofill = async (index: number, catalogNumber: string, brand: string) => {
    if (!catalogNumber || catalogNumber.length < 4) return; // Mínimo 4 caracteres para buscar

    // Si ya estamos buscando para este índice, no hacemos nada
    if (enrichingIndex === index) return;

    setEnrichingIndex(index);
    const toastId = showLoading("Buscando detalles del producto en el historial...");

    try {
      console.log(`RequestForm: Calling apiSearchExternalProduct for item ${index} with catalog: ${catalogNumber}, brand: ${brand}`);
      const productDetails: ProductDetails = await apiSearchExternalProduct(catalogNumber, brand);
      console.log("RequestForm: Received product details:", productDetails);

      // Usamos { shouldValidate: true } para que la validación se ejecute después de autocompletar
      form.setValue(`items.${index}.productName`, productDetails.productName || '', { shouldValidate: true });
      form.setValue(`items.${index}.format`, productDetails.format || '', { shouldValidate: true });
      form.setValue(`items.${index}.unitPrice`, productDetails.unitPrice || undefined, { shouldValidate: true });
      form.setValue(`items.${index}.link`, productDetails.link || '', { shouldValidate: true });
      form.setValue(`items.${index}.brand`, productDetails.brand || '', { shouldValidate: true });
      
      // Append notes
      const currentNotes = form.getValues(`items.${index}.notes`) || '';
      const newNotes = productDetails.notes ? `\n[Historial] ${productDetails.notes}` : '';
      form.setValue(`items.${index}.notes`, currentNotes + newNotes, { shouldValidate: true });

      showSuccess("¡Detalles del producto autocompletados desde el historial!");

    } catch (error: any) {
      // Si la búsqueda falla (ej. 404 No encontrado o Confianza baja), no detenemos el flujo.
      // Solo mostramos un mensaje informativo si el error no es el genérico [object Object].
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'object' && error !== null && error.message) ? error.message : String(error);
      
      // Si el error es que no se encontró información fiable, lo mostramos como info, no como error.
      if (errorMessage.includes("No se encontró información fiable")) {
        toast.info("Búsqueda de historial: No se encontraron coincidencias fiables. Por favor, introduce los detalles manualmente.");
      } else {
        // Para cualquier otro error inesperado (ej. error de red, error de servidor), mostramos un error.
        showError(errorMessage || "Fallo al buscar detalles del producto.");
      }
    } finally {
      dismissToast(toastId);
      setEnrichingIndex(null);
    }
  };

  // Debounced function for automatic search
  const debouncedAutofill = React.useCallback(
    debounce((index: number, catalogNumber: string, brand: string) => {
      handleAutofill(index, catalogNumber, brand);
    }, 800),
    [enrichingIndex] // Dependencia para evitar que se ejecute si ya hay una búsqueda en curso
  );

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => debouncedAutofill.cancel();
  }, [debouncedAutofill]);


  const onSubmit = async (data: RequestFormValues) => {
    if (!session?.user?.id) {
      showError("Debes iniciar sesión para enviar una solicitud.");
      return;
    }

    const managerId = data.accountManagerId === 'unassigned' || !data.accountManagerId ? null : data.accountManagerId;

    const requestData = {
      vendor_id: data.vendorId,
      requester_id: session.user.id,
      account_manager_id: managerId,
      notes: undefined, // Notes are now part of itemSchema, not top-level
      project_codes: data.projectCodes,
      items: data.items,
    };

    await addRequestMutation.mutateAsync(requestData);

    form.reset({
      vendorId: "",
      requesterId: session.user.id,
      accountManagerId: "unassigned",
      items: [{ 
        productName: "", 
        catalogNumber: "", 
        quantity: 1, 
        unitPrice: undefined, 
        format: "", 
        link: "", 
        notes: "", 
        brand: "",
        ai_enriched_product_name: undefined,
        ai_enriched_pack_size: undefined,
        ai_enriched_estimated_price: undefined,
        ai_enriched_link: undefined,
        ai_enriched_notes: undefined,
      }],
      projectCodes: [],
    });
  };

  const requesterName = profile ? getFullName(profile) : 'Cargando...';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Solicitante</FormLabel>
            <FormControl>
              <Input value={requesterName} readOnly disabled />
            </FormControl>
            <FormMessage />
          </FormItem>
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingVendors}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingVendors ? "Cargando proveedores..." : "Selecciona un proveedor"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="accountManagerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gerente de Cuenta (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingAccountManagers}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder={isLoadingAccountManagers ? "Cargando gerentes..." : "Selecciona un gerente de cuenta"} /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin Asignar</SelectItem>
                    {accountManagers?.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>{`${manager.first_name} ${manager.last_name}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="projectCodes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Códigos de Proyecto (Opcional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value || field.value.length === 0 && "text-muted-foreground")} disabled={isLoadingProjects}>
                        {field.value && field.value.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {field.value.map((projectId) => {
                              const project = projects?.find((p) => p.id === projectId);
                              return project ? <Badge key={projectId} variant="secondary">{project.code}</Badge> : null;
                            })}
                          </div>
                        ) : "Seleccionar proyectos..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar proyectos..." />
                      <CommandEmpty>No se encontró ningún proyecto.</CommandEmpty>
                      <CommandGroup>
                        {projects?.map((project) => (
                          <CommandItem value={project.name} key={project.id} onSelect={() => {
                            const currentValues = field.value || [];
                            if (currentValues.includes(project.id)) {
                              field.onChange(currentValues.filter((id) => id !== project.id));
                            } else {
                              field.onChange([...currentValues, project.id]);
                            }
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", field.value?.includes(project.id) ? "opacity-100" : "opacity-0")} />
                            {project.name} ({project.code})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <h2 className="text-xl font-semibold">Artículos</h2>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md relative">
              <h3 className="text-lg font-medium mb-4">Artículo #{index + 1}</h3>
              {fields.length > 1 && (
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="absolute top-4 right-4">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`items.${index}.brand`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input 
                          id="marca" 
                          placeholder="ej. Invitrogen" 
                          {...itemField} 
                          onChange={(e) => {
                            itemField.onChange(e);
                            const newBrand = e.target.value;
                            const catalogNumber = form.getValues(`items.${index}.catalogNumber`) || '';
                            debouncedAutofill(index, catalogNumber, newBrand);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.catalogNumber`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Número de Catálogo</FormLabel>
                      <FormControl>
                        <Input 
                          id="catalogo" 
                          placeholder="ej. 18265017" 
                          {...itemField} 
                          onChange={(e) => {
                            itemField.onChange(e);
                            const newCatalog = e.target.value;
                            const brand = form.getValues(`items.${index}.brand`) || '';
                            debouncedAutofill(index, newCatalog, brand);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Indicador de búsqueda */}
                {enrichingIndex === index && (
                  <div className="md:col-span-2 flex justify-end">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Buscando...
                  </div>
                )}
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Nombre del Producto</FormLabel>
                      <FormControl><Input id="nombre_producto" placeholder="ej. Células Competentes E. coli DH5a" {...itemField} /></FormControl>
                      <FormMessage />
                      {form.watch(`items.${index}.ai_enriched_product_name`) && (
                        <p className="text-xs text-muted-foreground">Sugerencia Historial: {form.watch(`items.${index}.ai_enriched_product_name`)}</p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl><Input id="cantidad" type="number" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: itemField }) => {
                    const aiPriceValue = form.watch(`items.${index}.ai_enriched_estimated_price`);
                    const hasAiPrice = aiPriceValue !== undefined && aiPriceValue !== null && aiPriceValue !== '';

                    return (
                      <FormItem>
                        <FormLabel>Precio Unitario (Opcional)</FormLabel>
                        <FormControl><Input id="precio_unitario" type="number" step="0.01" placeholder="ej. 120.50" {...itemField} /></FormControl>
                        <FormMessage />
                        {hasAiPrice && (
                          <p className="text-xs text-muted-foreground">Sugerencia Historial: ${Number(aiPriceValue).toFixed(2)}</p>
                        )}
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.format`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Formato (Opcional)</FormLabel>
                      <FormControl><Input id="formato" placeholder="ej. 200pack 8cs of 25" {...itemField} /></FormControl>
                      <FormMessage />
                      {form.watch(`items.${index}.ai_enriched_pack_size`) && (
                        <p className="text-xs text-muted-foreground">Sugerencia Historial: {form.watch(`items.${index}.ai_enriched_pack_size`)}</p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.link`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Enlace del Producto (Opcional)</FormLabel>
                      <FormControl><Input id="enlace_producto" type="url" placeholder="ej. https://www.vendor.com/product" {...itemField} /></FormControl>
                      <FormMessage />
                      {form.watch(`items.${index}.ai_enriched_link`) && (
                        <p className="text-xs text-muted-foreground">Sugerencia Historial: <a href={form.watch(`items.${index}.ai_enriched_link`)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver Enlace</a></p>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.notes`}
                  render={({ field: itemField }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Notas (Opcional)</FormLabel>
                      <FormControl><Textarea id="notas" placeholder="Cualquier requisito o detalle específico..." {...itemField} /></FormControl>
                      <FormMessage />
                      {form.watch(`items.${index}.ai_enriched_notes`) && (
                        <p className="text-xs text-muted-foreground">Sugerencia Historial: {form.watch(`items.${index}.ai_enriched_notes`)}</p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={() => append({ 
          productName: "", 
          catalogNumber: "", 
          quantity: 1, 
          unitPrice: undefined, 
          format: "", 
          link: "", 
          notes: "", 
          brand: "",
          ai_enriched_product_name: undefined,
          ai_enriched_pack_size: undefined,
          ai_enriched_estimated_price: undefined,
          ai_enriched_link: undefined,
          ai_enriched_notes: undefined,
        })} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Otro Artículo
        </Button>
        <h2 className="text-xl font-semibold mt-8 mb-4">Archivos Adjuntos (Opcional)</h2>
        <FormField
          control={form.control}
          name="attachments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subir Archivos (ej. Cotizaciones, PDFs)</FormLabel>
              <FormControl><Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} /></FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">Nota: La subida de archivos requiere un backend para almacenar los archivos. Esto es un marcador de posición.</p>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={addRequestMutation.isPending}>
          {addRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Enviar Solicitud"}
        </Button>
      </form>
    </Form>
  );
};

export default RequestForm;