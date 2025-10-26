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
import { PlusCircle, Trash2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import { useAddRequest } from "@/hooks/use-requests";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { getFullName } from "@/hooks/use-profiles";

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
  items: z.array(itemSchema).min(1, { message: "Se requiere al menos un artículo." }),
  attachments: z.any().optional(),
  projectCodes: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof formSchema>;

const RequestForm: React.FC = () => {
  const { session, profile } = useSession();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: accountManagers, isLoading: isLoadingAccountManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const addRequestMutation = useAddRequest();

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
      }],
      projectCodes: [],
      notes: "",
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

  const onSubmit = async (data: RequestFormValues) => {
    if (!session?.user?.id) {
      showError("Debes iniciar sesión para enviar una solicitud.");
      return;
    }

    const managerId = data.accountManagerId === 'unassigned' || !data.accountManagerId ? null : data.accountManagerId;

    // Mapear los ítems para que coincidan con la interfaz RequestItem
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

    await addRequestMutation.mutateAsync({
      vendorId: data.vendorId,
      requesterId: session.user.id,
      accountManagerId: managerId,
      notes: data.notes,
      projectCodes: data.projectCodes,
      items: itemsToSubmit,
    });

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
      }],
      projectCodes: [],
      notes: "",
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.productName`}
                  render={({ field: itemField }) => (
                    <FormItem>
                      <FormLabel>Nombre del Producto</FormLabel>
                      <FormControl><Input id="nombre_producto" placeholder="ej. Células Competentes E. coli DH5a" {...itemField} /></FormControl>
                      <FormMessage />
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
                    return (
                      <FormItem>
                        <FormLabel>Precio Unitario (Opcional)</FormLabel>
                        <FormControl><Input id="precio_unitario" type="number" step="0.01" placeholder="ej. 120.50" {...itemField} /></FormControl>
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
                      <FormControl><Input id="formato" placeholder="ej. 200pack 8cs of 25" {...itemField} /></FormControl>
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
                      <FormControl><Input id="enlace_producto" type="url" placeholder="ej. https://www.vendor.com/product" {...itemField} /></FormControl>
                      <FormMessage />
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