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
import { Project } from "@/data/types"; // Corrected import

const projectFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre del proyecto es obligatorio." }),
  code: z.string().min(1, { message: "El código del proyecto es obligatorio." }),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: ProjectFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      code: initialData.code,
    } : {
      name: "",
      code: "",
    },
  });

  const handleSubmit = (data: ProjectFormValues) => {
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
              <FormLabel>Nombre del Proyecto</FormLabel>
              <FormControl>
                <Input placeholder="ej. Descubrimiento de Nuevo Fármaco" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Proyecto</FormLabel>
              <FormControl>
                <Input placeholder="ej. ND-001" {...field} disabled={isSubmitting || !!initialData} />
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
              initialData ? "Guardar Cambios" : "Añadir Proyecto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectForm;