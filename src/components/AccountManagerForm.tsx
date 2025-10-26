"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod"; // Corregido: de '*s as z' a '* as z'
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
import { Profile } from "@/hooks/use-profiles";

const accountManagerFormSchema = z.object({
  first_name: z.string().min(1, { message: "El nombre es obligatorio." }),
  last_name: z.string().min(1, { message: "El apellido es obligatorio." }),
  email: z.string().email({ message: "Debe ser una dirección de correo válida." }).min(1, { message: "El email es obligatorio." }),
});

export type AccountManagerFormValues = z.infer<typeof accountManagerFormSchema>;

interface AccountManagerFormProps {
  initialData?: Profile;
  onSubmit: (data: AccountManagerFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const AccountManagerForm: React.FC<AccountManagerFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<AccountManagerFormValues>({
    resolver: zodResolver(accountManagerFormSchema),
    defaultValues: initialData ? {
      first_name: initialData.first_name || "",
      last_name: initialData.last_name || "",
      email: initialData.email || "",
    } : {
      first_name: "",
      last_name: "",
      email: "",
    },
  });

  const handleSubmit = (data: AccountManagerFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="ej. John" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Apellido</FormLabel>
              <FormControl>
                <Input placeholder="ej. Doe" {...field} disabled={isSubmitting} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ej. john.doe@ejemplo.com" {...field} disabled={isSubmitting || !!initialData} />
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
              initialData ? "Guardar Cambios" : "Añadir Gerente"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccountManagerForm;