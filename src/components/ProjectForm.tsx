"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { Project, Profile } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";

const projectFormSchema = z.object({
  name: z.string().optional(),
  code: z.string().min(1, { message: "El código del proyecto es obligatorio." }),
  entidad: z.string().min(1, { message: "La entidad es obligatoria." }),
  entidad_cif: z.string().min(1, { message: "El CIF de la entidad es obligatorio." }),
  ip_profile_id: z.string().optional().nullable(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin: z.string().optional().nullable(),
  activo: z.boolean(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema> & {
  name: string;
};

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
  const form = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          code: initialData.code,
          entidad: initialData.entidad ?? "",
          entidad_cif: initialData.entidad_cif ?? "",
          ip_profile_id: initialData.ip_profile_id,
          fecha_inicio: initialData.fecha_inicio ?? "",
          fecha_fin: initialData.fecha_fin ?? "",
          activo: initialData.activo !== false,
        }
      : {
          name: "",
          code: "",
          entidad: "",
          entidad_cif: "",
          ip_profile_id: null,
          fecha_inicio: "",
          fecha_fin: "",
          activo: true,
        },
  });

  const handleSubmit = (data: z.infer<typeof projectFormSchema>) => {
    const entidad = data.entidad.trim();
    const nameTrimmed = data.name?.trim() ?? "";
    onSubmit({
      ...data,
      entidad,
      entidad_cif: data.entidad_cif.trim(),
      fecha_inicio: data.fecha_inicio?.trim() || null,
      fecha_fin: data.fecha_fin?.trim() || null,
      activo: data.activo,
      // Mantener compatibilidad con selectores que muestran project.name
      name: nameTrimmed || entidad,
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
          name="ip_profile_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Investigador responsable</FormLabel>
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
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código Proyecto</FormLabel>
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
          name="entidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entidad</FormLabel>
              <FormControl>
                <Input
                  placeholder="ej. Universidad de Granada"
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
          name="entidad_cif"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CIF de la entidad</FormLabel>
              <FormControl>
                <Input
                  placeholder="ej. Q1818002F"
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre para listados (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Si se deja vacío, se usa la entidad"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Se muestra en selectores junto al código del proyecto.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fecha_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha inicio (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fecha_fin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha fin (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Proyecto activo</FormLabel>
                <FormDescription>
                  Si está desactivado, no aparece al crear pedidos nuevos.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
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
