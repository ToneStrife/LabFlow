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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Project, Profile } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";

const projectFormSchema = z.object({
  name: z.string().min(1, { message: "El nombre del proyecto es obligatorio." }),
  code: z.string().min(1, { message: "El código del proyecto es obligatorio." }),
  ip_profile_id: z.string().optional().nullable(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  initialData?: Project;
  profiles?: Profile[];
  onSubmit: (data: ProjectFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  profiles = [],
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          ip_profile_id: initialData.ip_profile_id,
        }
      : {
          name: "",
          code: "",
          ip_profile_id: null,
        },
  });

  const handleSubmit = (data: ProjectFormValues) => {
    onSubmit({
      ...data,
      ip_profile_id:
        !data.ip_profile_id || data.ip_profile_id === "none"
          ? null
          : data.ip_profile_id,
    });
  };

  const candidatos = React.useMemo(
    () =>
      [...profiles].sort((a, b) =>
        getFullName(a).localeCompare(getFullName(b), "es")
      ),
    [profiles]
  );

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
                <Input
                  placeholder="ej. Descubrimiento de Nuevo Fármaco"
                  {...field}
                  disabled={isSubmitting}
                />
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
                <Input
                  placeholder="ej. ND-001"
                  {...field}
                  disabled={isSubmitting || !!initialData}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ip_profile_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investigador Principal (IP)</FormLabel>
              <Select
                disabled={isSubmitting}
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? null : value)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {candidatos.map((perfil) => (
                    <SelectItem key={perfil.id} value={perfil.id}>
                      {getFullName(perfil)}
                      {perfil.role === "Admin" ? " · Admin" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Quien aprueba las solicitudes de compra de este proyecto.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : initialData ? (
              "Guardar Cambios"
            ) : (
              "Añadir Proyecto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectForm;
