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

const inviteUserFormSchema = z.object({
  email: z.string().email({ message: "Debe ser una dirección de correo válida." }).min(1, { message: "El email es obligatorio." }),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

interface InviteUserDialogProps {
  onSubmit: (data: InviteUserFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
    },
  });

  const handleSubmit = async (data: InviteUserFormValues) => {
    console.log("Submitting invite user data:", data); // Added console.log
    await onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ej. usuario@ejemplo.com" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ej. Jane" {...field} disabled={isSubmitting} />
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
              <FormLabel>Apellido (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ej. Doe" {...field} disabled={isSubmitting} />
              </FormControl>
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              "Enviar Invitación"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default InviteUserDialog;