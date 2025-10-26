"use client";

import React from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input"; // Importación corregida
import { cn } from "@/lib/utils";
import { SupabaseRequest } from "@/hooks/use-requests";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";
import { useVendors } from "@/hooks/use-vendors";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { getFullName, Profile } from "@/hooks/use-profiles";

const fullEditSchema = z.object({
  vendorId: z.string().min(1, { message: "El proveedor es obligatorio." }),
  shippingAddressId: z.string().min(1, { message: "La dirección de envío es obligatoria." }),
  billingAddressId: z.string().min(1, { message: "La dirección de facturación es obligatoria." }),
  accountManagerId: z.union([
    z.string().uuid({ message: "ID de gerente no válido." }),
    z.literal("unassigned"),
  ]).optional(),
  notes: z.string().optional(),
  projectCodes: z.array(z.string()).optional(),
});

export type FullEditFormValues = z.infer<typeof fullEditSchema>;

interface RequestFullEditFormProps {
  request: SupabaseRequest;
  profiles: Profile[];
  onSubmit: (data: FullEditFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const RequestFullEditForm: React.FC<RequestFullEditFormProps> = ({ request, profiles, onSubmit, isSubmitting }) => {
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: accountManagers, isLoading: isLoadingManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();

  const defaultProjectCodes = request.project_codes || [];
  const requesterProfile = profiles.find(p => p.id === request.requester_id);

  const form = useForm<FullEditFormValues>({
    resolver: zodResolver(fullEditSchema),
    defaultValues: {
      vendorId: request.vendor_id,
      shippingAddressId: request.shipping_address_id || "",
      billingAddressId: request.billing_address_id || "",
      accountManagerId: request.account_manager_id || "unassigned",
      notes: request.notes || "",
      projectCodes: defaultProjectCodes,
    },
    values: { // Usar values para asegurar que el formulario se actualice si la solicitud cambia
      vendorId: request.vendor_id,
      shippingAddressId: request.shipping_address_id || "",
      billingAddressId: request.billing_address_id || "",
      accountManagerId: request.account_manager_id || "unassigned",
      notes: request.notes || "",
      projectCodes: defaultProjectCodes,
    }
  });

  const handleSubmit = (data: FullEditFormValues) => {
    onSubmit(data);
  };

  const isLoading = isLoadingVendors || isLoadingManagers || isLoadingProjects || isLoadingShippingAddresses || isLoadingBillingAddresses;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>Solicitante</FormLabel>
            <FormControl>
              <Input value={getFullName(requesterProfile)} readOnly disabled />
            </FormControl>
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingShippingAddresses || isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingShippingAddresses ? "Cargando direcciones..." : "Selecciona dirección de envío"} />
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingBillingAddresses || isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBillingAddresses ? "Cargando direcciones..." : "Selecciona dirección de facturación"} />
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
                <FormLabel>Gerente de Cuenta Asignado</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingManagers || isSubmitting}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder={isLoadingManagers ? "Cargando gerentes..." : "Selecciona un gerente de cuenta"} /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin Gerente</SelectItem>
                    {accountManagers?.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {`${manager.first_name} ${manager.last_name}`}
                      </SelectItem>
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
                <FormLabel>Códigos de Proyecto</FormLabel>
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
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Cualquier detalle específico sobre esta solicitud..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar Todos los Cambios"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RequestFullEditForm;