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
import { PlusCircle, Trash2, Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RequestItem } from "@/data/types";
import { showError } from "@/utils/toast";
import { useSession } from "@/components/SessionContextProvider";
import { useVendors } from "@/hooks/use-vendors";
import { useAddRequest, useUpdateRequestFile, useUpdateRequestStatus } from "@/hooks/use-requests"; // Importar useUpdateRequestStatus
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { getFullName } from "@/hooks/use-profiles";
import { useProductSearch, ProductSearchResult } from "@/hooks/use-product-search"; // Importar hook de búsqueda

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
});

const formSchema = z.object({
  vendorId: z.string().min(1, { message: "El proveedor es obligatorio." }),
  requesterId: z.string().min(1, { message: "El ID del solicitante es obligatorio." }), 
  accountManagerId: z.string().optional(), 
  shippingAddressId: z.string().min(1, { message: "La dirección de envío es obligatoria." }),
  billingAddressId: z.string().min(1, { message: "La dirección de facturación es obligatoria." }),
  items: z.array(itemSchema).min(1, { message: "Se requiere al menos un artículo." }),
  quoteFile: z.any().optional(), // Nuevo campo para el archivo de cotización
  projectCodes: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof formSchema>;

// Componente auxiliar para manejar el autocompletado de un solo ítem
interface ItemAutofillProps {
  index: number;
  form: ReturnType<typeof useForm<RequestFormValues>>;
}

const ItemAutofill: React.FC<ItemAutofillProps> = ({ index, form }) => {
  const { control, watch, setValue } = form;
  
  // Observar los campos clave para la búsqueda
  const productName = watch(`items.${index}.productName`);
  const catalogNumber = watch(`items.${index}.catalogNumber`);
  const brand = watch(`items.${index}.brand`);

  // Usar el hook de búsqueda
  const { data: searchResults, isLoading: isSearching } = useProductSearch(
    catalogNumber || null,
    brand || null,
    productName || null
  );

  const handleAutofill = (result: ProductSearchResult) => {
    setValue(`items.${index}.productName`, result.product_name, { shouldDirty: true });
    setValue(`items.${index}.catalogNumber`, result.catalog_number, { shouldDirty: true });
    setValue(`items.${index}.brand`, result.brand || "", { shouldDirty: true });
    setValue(`items.${index}.unitPrice`, result.unit_price || undefined, { shouldDirty: true });
    setValue(`items.${index}.format`, result.format || "", { shouldDirty: true });
    setValue(`items.${index}.link`, result.link || "", { shouldDirty: true });
    
    toast.info("Autocompletado aplicado.", {
      description: `Datos cargados desde ${result.source}.`,
    });
  };

  const hasResults = searchResults && searchResults.length > 0;
  
  // Habilitar si hay catálogo Y marca, O si hay nombre de producto con más de 3 caracteres
  const isSearchEnabled = 
    (!!catalogNumber && !!brand) || 
    (!!productName && productName.length > 3);

  return (
    <div className="absolute top-4 right-4">
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs"
            disabled={isSearching || !isSearchEnabled}
          >
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {hasResults ? `Sugerencias (${searchResults.length})` : "Buscar Sugerencias"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command>
            {isSearching && <CommandEmpty>Buscando...</CommandEmpty>}
            {!isSearching && !hasResults && <CommandEmpty>No se encontraron sugerencias.</CommandEmpty>}
            <CommandGroup heading="Sugerencias de Productos">
              {searchResults?.map((result, i) => (
                <CommandItem key={i} onSelect={() => handleAutofill(result)} className="cursor-pointer">
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{result.product_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {result.catalog_number} | {result.brand || 'Sin Marca'} ({result.source})
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};


const RequestForm: React.FC = () => {
  const { session, profile } = useSession();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();
  const addRequestMutation = useAddRequest();
  const updateFileMutation = useUpdateRequestFile(); // Para subir el archivo de cotización
  const updateStatusMutation = useUpdateRequestStatus(); // Para actualizar el estado después de la subida

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vendorId: "",
      requesterId: session?.user?.id || "",
      accountManagerId: "unassigned",
      shippingAddressId: "",
      billingAddressId: "",
      items: [{ 
        productName: "", 
        catalogNumber: "", 
        quantity: 1, 
        unitPrice: undefined, 
        format: "", 
        link: "", 
        notes: "", 
        brand: "",
      }],
      quoteFile: undefined,
      projectCodes: [],
      notes: "",
    },
  });

  // Establecer valores predeterminados para direcciones y solicitante
  React.useEffect(() => {
    if (session?.user?.id) {
      form.setValue("requesterId", session.user.id);
    }
  }, [session, form]);

  React.useEffect(() => {
    if (shippingAddresses && shippingAddresses.length > 0 && !form.getValues("shippingAddressId")) {
      form.setValue("shippingAddressId", shippingAddresses[0].id);
    }
  }, [shippingAddresses, form]);

  React.useEffect(() => {
    if (billingAddresses && billingAddresses.length > 0 && !form.getValues("billingAddressId")) {
      form.setValue("billingAddressId", billingAddresses[0].id);
    }
  }, [billingAddresses, form]);


  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const onSubmit = async (data: RequestFormValues) => {
    if (!session?.user?.id) {
      showError("Debes iniciar sesión para enviar una solicitud.");
      return;
    }

    const managerId = data.accountManagerId === 'unassigned' || !data.accountManagerId ? null : data.accountManagerId;
    const quoteFile = data.quoteFile?.[0] || null;
    
    // 1. Crear la solicitud (inicialmente en estado Pending)
    const itemsToSubmit: RequestItem[] = data.items.map(item => ({
      productName: item.productName,
      catalogNumber: item.catalogNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      format: item.format,
      link: item.link,
      notes: item.notes,
      brand: item.brand,
    }));

    const newRequest = await addRequestMutation.mutateAsync({
      vendorId: data.vendorId,
      requesterId: session.user.id,
      accountManagerId: managerId,
      shippingAddressId: data.shippingAddressId,
      billingAddressId: data.billingAddressId,
      notes: data.notes,
      projectCodes: data.projectCodes,
      items: itemsToSubmit,
    });
    
    // 2. Si hay un archivo de cotización, subirlo y actualizar el estado a 'Quote Requested'
    if (quoteFile) {
      try {
        const { filePath } = await updateFileMutation.mutateAsync({
          id: newRequest.id,
          fileType: "quote",
          file: quoteFile,
        });
        
        // Actualizar el estado de la solicitud a 'Quote Requested'
        if (filePath) {
            await updateStatusMutation.mutateAsync({ 
                id: newRequest.id, 
                status: "Quote Requested", 
                quoteUrl: filePath 
            });
            toast.success("Cotización adjunta. Solicitud marcada como 'Cotización Solicitada'.");
        }
      } catch (error) {
        showError("La solicitud fue creada, pero falló la subida del archivo de cotización.");
        console.error("Error uploading quote file on request creation:", error);
      }
    }

    // Restablecer el formulario, manteniendo los valores predeterminados de dirección si existen
    form.reset({
      vendorId: "",
      requesterId: session.user.id,
      accountManagerId: shippingAddresses?.[0]?.id || "",
      shippingAddressId: shippingAddresses?.[0]?.id || "",
      billingAddressId: billingAddresses?.[0]?.id || "",
      items: [{ 
        productName: "", 
        catalogNumber: "", 
        quantity: 1, 
        unitPrice: undefined, 
        format: "", 
        link: "", 
        notes: "", 
        brand: "",
      }],
      quoteFile: undefined,
      projectCodes: [],
      notes: "",
    });
  };

  const requesterName = profile ? getFullName(profile) : 'Cargando...';
  const isLoadingAddresses = isLoadingShippingAddresses || isLoadingBillingAddresses;
  const isSubmitting = addRequestMutation.isPending || updateFileMutation.isPending;

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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingVendors || isSubmitting}>
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
            name="shippingAddressId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección de Envío</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAddresses || isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAddresses ? "Cargando direcciones..." : "Selecciona dirección de envío"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {shippingAddresses?.map((address) => (
                      <SelectItem key={address.id} value={address.id}>{address.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingAddressId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección de Facturación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAddresses || isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAddresses ? "Cargando direcciones..." : "Selecciona dirección de facturación"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {billingAddresses?.map((address) => (
                      <SelectItem key={address.id} value={address.id}>{address.name}</SelectItem>
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
                <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingAccountManagers || isSubmitting}>
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
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value || field.value.length === 0 && "text-muted-foreground")} disabled={isLoadingProjects || isSubmitting}>
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
        
        <h2 className="text-xl font-semibold mt-8 mb-4">Archivos Adjuntos (Opcional)</h2>
        <FormField
          control={form.control}
          name="quoteFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adjuntar Cotización (Si ya la tienes)</FormLabel>
              <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} /></FormControl>
              <FormMessage />
              <p className="text-sm text-muted-foreground">Si adjuntas una cotización, la solicitud se creará directamente en estado "Cotización Solicitada".</p>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Generales de la Solicitud (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cualquier detalle general sobre esta solicitud..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <h2 className="text-xl font-semibold">Artículos</h2>
        <div className="space-y-6">
          {fields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md relative bg-muted/20 pt-16 sm:pt-4">
              <h3 className="text-lg font-medium mb-4 text-primary hidden sm:block">Artículo #{index + 1}</h3>
              
              {/* Autofill Component */}
              <ItemAutofill index={index} form={form} />

              {fields.length > 1 && (
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="absolute top-4 left-4 h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fila 1: Marca, Catálogo, Nombre, Cantidad */}
                <FormField
                  control={form.control}
                  name={`items.${index}.brand`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl><Input placeholder="ej. Invitrogen" {...itemField} /></FormControl>
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
                      <FormControl><Input placeholder="ej. 18265017" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field: itemField }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel>Nombre del Producto</FormLabel>
                      <FormControl><Input placeholder="ej. Células Competentes E. coli DH5a" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Fila 2: Cantidad, Precio, Formato, Enlace */}
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl><Input type="number" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: itemField }) => {
                    return (
                      <FormItem>
                        <FormLabel>Precio Unitario (Opcional)</FormLabel>
                        <FormControl><Input type="number" step="0.01" placeholder="ej. 120.50 €" {...itemField} /></FormControl>
                        <FormMessage />
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
                      <FormControl><Input placeholder="ej. 500 mL" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.link`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Enlace del Producto (Opcional)</FormLabel>
                      <FormControl><Input type="url" placeholder="ej. https://www.vendor.com/product" {...itemField} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Fila 3: Notas */}
                <FormField
                  control={form.control}
                  name={`items.${index}.notes`}
                  render={({ field: itemField }) => (
                    <FormItem className="lg:col-span-4">
                      <FormLabel>Notas (Opcional)</FormLabel>
                      <FormControl><Textarea placeholder="Cualquier requisito o detalle específico..." {...itemField} /></FormControl>
                      <FormMessage />
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
        })} className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Otro Artículo
        </Button>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Enviar Solicitud"}
        </Button>
      </form>
    </Form>
  );
};

export default RequestForm;