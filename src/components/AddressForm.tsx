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
import { Address } from "@/data/types";

const addressFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre de la dirección es obligatorio." }),
  address_line_1: z.string().min(1, { message: "La Línea de Dirección 1 es obligatoria." }),
  address_line_2: z.string().optional().nullable(),
  city: z.string().min(1, { message: "La Ciudad es obligatoria." }),
  state: z.string().min(1, { message: "El Estado/Provincia es obligatorio." }),
  zip_code: z.string().min(1, { message: "El Código Postal es obligatorio." }),
  country: z.string().min(1, { message: "El País es obligatorio." }),
  cif: z.string().optional().nullable(), // Nuevo campo CIF
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;

interface AddressFormProps {
  initialData?: Address;
  onSubmit: (data: AddressFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const AddressForm: React.FC<AddressFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      address_line_1: initialData.address_line_1,
      address_line_2: initialData.address_line_2 || null,
      city: initialData.city,
      state: initialData.state,
      zip_code: initialData.zip_code,
      country: initialData.country,
      cif: initialData.cif || null,
    } : {
      name: "",
      address_line_1: "",
      address_line_2: null,
      city: "",
      state: "",
      zip_code: "",
      country: "",
      cif: null,
    },
  });

  const handleSubmit = (data: AddressFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Dirección (ej. Laboratorio Principal, Almacén)</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cif"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CIF / ID de IVA (Opcional)</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address_line_1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Línea de Dirección 1</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address_line_2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Línea de Dirección 2 (Opcional)</FormLabel>
              <FormControl><Input {...field} disabled={isSubmitting} value={field.value || ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado/Provincia</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="zip_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Postal</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
              initialData ? "Guardar Cambios" : "Añadir Dirección"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddressForm;