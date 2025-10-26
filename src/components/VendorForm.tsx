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
import { Loader2 } from "lucide-react"; // Import Loader2

const vendorFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre del proveedor es obligatorio." }),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email({ message: "Debe ser una dirección de correo válida." }).optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  brands: z.string().optional().nullable(), // Permitir null
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  initialData?: VendorFormValues;
  onSubmit: (data: VendorFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean; // Add isSubmitting prop
}

const VendorForm: React.FC<VendorFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialData || {
      name: "",
      contactPerson: null,
      email: null,
      phone: null,
      notes: null,
      brands: null, // Initialize brands as null
    },
  });

  const handleSubmit = (data: VendorFormValues) => {
    // Convertir cadenas vacías a null antes de enviar, si el campo es opcional/nullable
    const cleanedData: VendorFormValues = {
      ...data,
      contactPerson: data.contactPerson || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      brands: data.brands || null,
    };
    onSubmit(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proveedor</FormLabel>
              <FormControl>
                <Input placeholder="ej. Thermo Fisher Scientific" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona de Contacto (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ej. Jane Doe" 
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
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="ej. jane.doe@example.com" 
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
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono (Opcional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ej. 1-800-123-4567" 
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
        <FormField
          control={form.control}
          name="brands"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marcas (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="ej. Invitrogen, Applied Biosystems, Gibco (separadas por comas)"
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
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Cualquier detalle específico sobre este proveedor..." 
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
              initialData ? "Guardar Cambios" : "Añadir Proveedor"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default VendorForm;