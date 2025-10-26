"use client";

import React from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { InventoryItem } from "@/hooks/use-inventory";
import { useVendors } from "@/hooks/use-vendors";
import { useShippingAddresses, useBillingAddresses } from "@/hooks/use-addresses";
import { useAddRequest } from "@/hooks/use-requests";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const reorderSchema = z.object({
  vendorId: z.string().min(1, { message: "El proveedor es obligatorio." }),
  shippingAddressId: z.string().min(1, { message: "La dirección de envío es obligatoria." }),
  billingAddressId: z.string().min(1, { message: "La dirección de facturación es obligatoria." }),
});

type ReorderFormValues = z.infer<typeof reorderSchema>;

interface ReorderDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
}

const ReorderDialog: React.FC<ReorderDialogProps> = ({ isOpen, onOpenChange, items }) => {
  const { session } = useSession();
  const navigate = useNavigate();
  const { data: vendors, isLoading: isLoadingVendors } = useVendors();
  const { data: shippingAddresses, isLoading: isLoadingShippingAddresses } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBillingAddresses } = useBillingAddresses();
  const addRequestMutation = useAddRequest();

  const form = useForm<ReorderFormValues>({
    resolver: zodResolver(reorderSchema),
    defaultValues: {
      vendorId: "",
      shippingAddressId: "",
      billingAddressId: "",
    },
  });

  // Establecer valores predeterminados para direcciones
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

  const handleSubmit = async (data: ReorderFormValues) => {
    if (!session?.user?.id) {
      toast.error("Error de sesión", { description: "Debes iniciar sesión para reordenar." });
      return;
    }

    const itemsToSubmit = items.map(item => ({
      productName: item.product_name,
      catalogNumber: item.catalog_number,
      quantity: item.quantity > 0 ? item.quantity : 1, // Usar la cantidad actual o 1 por defecto
      unitPrice: item.unit_price || undefined,
      format: item.format || undefined,
      link: undefined, // No tenemos el link en el inventario, se puede añadir manualmente después
      notes: `Reorder de Inventario (Cant. original: ${item.quantity})`,
      brand: item.brand || undefined,
    }));

    try {
      const newRequest = await addRequestMutation.mutateAsync({
        vendorId: data.vendorId,
        requesterId: session.user.id,
        accountManagerId: null, // Dejar sin asignar por defecto
        shippingAddressId: data.shippingAddressId,
        billingAddressId: data.billingAddressId,
        notes: `Solicitud de Reordenamiento generada automáticamente para ${items.length} artículos.`,
        projectCodes: null,
        items: itemsToSubmit,
      });

      onOpenChange(false);
      navigate(`/requests/${newRequest.id}`);
    } catch (e) {
      // El error ya se maneja en useAddRequest
    }
  };

  const isLoading = isLoadingVendors || isLoadingShippingAddresses || isLoadingBillingAddresses;
  const isSubmitting = addRequestMutation.isPending;

  // Lógica para sugerir proveedores basados en las marcas de los ítems seleccionados
  const itemBrands = items.map(item => item.brand).filter((b): b is string => !!b);
  const uniqueBrands = Array.from(new Set(itemBrands.map(b => b.toLowerCase())));
  
  const suggestedVendors = vendors?.filter(vendor => 
    vendor.brands?.some(vendorBrand => uniqueBrands.includes(vendorBrand.toLowerCase()))
  ) || [];
  
  const allVendors = vendors || [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reordenar Artículos de Inventario</DialogTitle>
          <DialogDescription>
            Crear una nueva solicitud de compra para los {items.length} artículos seleccionados.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            <div className="space-y-2">
              <h4 className="font-semibold">Artículos a Reordenar:</h4>
              <ul className="list-disc list-inside text-sm max-h-24 overflow-y-auto p-2 border rounded-md">
                {items.map(item => (
                  <li key={item.id} className="truncate">
                    {item.product_name} ({item.catalog_number}) - Cantidad: {item.quantity}
                  </li>
                ))}
              </ul>
            </div>

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
                      {suggestedVendors.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Proveedores Sugeridos (por Marca)</SelectLabel>
                          {suggestedVendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      <SelectGroup>
                        <SelectLabel>Todos los Proveedores</SelectLabel>
                        {allVendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando Solicitud...
                  </>
                ) : (
                  "Crear Solicitud de Reordenamiento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReorderDialog;