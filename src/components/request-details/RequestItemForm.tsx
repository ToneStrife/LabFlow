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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";

const itemEditSchema = z.object({
  product_name: z.string().min(1, { message: "El nombre del producto es obligatorio." }),
  catalog_number: z.string().min(1, { message: "El número de catálogo es obligatorio." }),
  brand: z.string().optional().nullable(),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, { message: "La cantidad debe ser al menos 1." })
  ),
  unit_price: z.preprocess(
    (val) => (val === null || val === "" ? null : Number(val)),
    z.number().min(0, { message: "El precio unitario no puede ser negativo." }).nullable().optional()
  ),
  format: z.string().optional().nullable(),
  link: z.string().url({ message: "Debe ser una URL válida." }).optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export type ItemEditFormValues = z.infer<typeof itemEditSchema>;

interface RequestItemFormProps {
  initialData: SupabaseRequestItem;
  onSubmit: (data: ItemEditFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const RequestItemForm: React.FC<RequestItemFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<ItemEditFormValues>({
    resolver: zodResolver(itemEditSchema),
    defaultValues: {
      product_name: initialData.product_name,
      catalog_number: initialData.catalog_number,
      brand: initialData.brand || null,
      quantity: initialData.quantity,
      unit_price: initialData.unit_price,
      format: initialData.format || null,
      link: initialData.link || null,
      notes: initialData.notes || null,
    },
  });

  const handleSubmit = (data: ItemEditFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="product_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
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
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
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
                <FormControl><Input {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
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
                <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value)} disabled={isSubmitting} /></FormControl>
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
                <FormControl><Input type="number" step="0.01" placeholder="ej. 120.50 €" {...field} value={field.value === null ? "" : field.value} onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} disabled={isSubmitting} /></FormControl>
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
                <FormControl><Input {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="link"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Enlace del Producto (Opcional)</FormLabel>
                <FormControl><Input type="url" {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
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
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl><Textarea {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar Cambios del Artículo"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RequestItemForm;