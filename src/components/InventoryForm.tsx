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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { InventoryItem } from "@/hooks/use-inventory";

const inventoryFormSchema = z.object({
  product_name: z.string().min(1, { message: "El nombre del producto es obligatorio." }),
  catalog_number: z.string().min(1, { message: "El número de catálogo es obligatorio." }),
  brand: z.string().optional().nullable(),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "La cantidad no puede ser negativa." })
  ),
  unit_price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: "El precio unitario no puede ser negativo." }).nullable().optional()
  ),
  format: z.string().optional().nullable(),
});

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

interface InventoryFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: initialData ? {
      product_name: initialData.product_name,
      catalog_number: initialData.catalog_number,
      brand: initialData.brand,
      quantity: initialData.quantity,
      unit_price: initialData.unit_price,
      format: initialData.format,
    } : {
      product_name: "",
      catalog_number: "",
      brand: null,
      quantity: 0,
      unit_price: null,
      format: null,
    },
  });

  const handleSubmit = (data: InventoryFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Producto</FormLabel>
              <FormControl>
                <Input placeholder="ej. Anticuerpo Anti-GFP" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ej. Invitrogen" {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="catalog_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Catálogo</FormLabel>
              <FormControl>
                <Input placeholder="ej. 18265017" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cantidad</FormLabel>
              <FormControl>
                <Input type="number" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precio Unitario (Opcional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="ej. 120.50" {...field} disabled={isSubmitting} value={field.value === null ? "" : field.value} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Formato (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ej. 200pack 8cs of 25" {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              initialData ? "Guardar Cambios" : "Añadir Artículo"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InventoryForm;