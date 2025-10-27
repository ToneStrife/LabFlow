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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupabaseRequest } from "@/data/types"; // Corrected import
import { Profile } from "@/hooks/use-profiles";
import { useAccountManagers } from "@/hooks/use-account-managers";
import { useProjects } from "@/hooks/use-projects";

const metadataSchema = z.object({
  accountManagerId: z.union([
    z.string().uuid({ message: "ID de gerente no válido." }),
    z.literal("unassigned"),
  ]).optional(),
  notes: z.string().optional(),
  projectCodes: z.array(z.string()).optional(),
});

type MetadataFormValues = z.infer<typeof metadataSchema>;

interface RequestMetadataFormProps {
  request: SupabaseRequest;
  profiles: Profile[];
  onSubmit: (data: MetadataFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const RequestMetadataForm: React.FC<RequestMetadataFormProps> = ({ request, onSubmit, isSubmitting }) => {
  const { data: accountManagers, isLoading: isLoadingManagers } = useAccountManagers();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();

  const defaultProjectCodes = request.project_codes || [];

  const form = useForm<MetadataFormValues>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      accountManagerId: request.account_manager_id || "unassigned",
      notes: request.notes || "",
      projectCodes: defaultProjectCodes,
    },
    values: { // Usar values para asegurar que el formulario se actualice si la solicitud cambia
      accountManagerId: request.account_manager_id || "unassigned",
      notes: request.notes || "",
      projectCodes: defaultProjectCodes,
    }
  });

  const handleSubmit = (data: MetadataFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="accountManagerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gerente de Cuenta Asignado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "unassigned"} disabled={isLoadingManagers || isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingManagers ? "Cargando gerentes..." : "Selecciona un gerente de cuenta"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Sin Gerente</SelectItem>
                  {accountManagers?.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {`${manager.first_name} ${manager.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectCodes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Códigos de Proyecto</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value || field.value.length === 0 && "text-muted-foreground")} disabled={isLoadingProjects || isSubmitting}>
                      {field.value && field.value.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {field.value.map((projectId) => {
                            const project = projects?.find((p) => p.id === projectId);
                            return project ? <Badge key={projectId} variant="secondary">{project.code}</Badge> : null;
                          })}
                        </div>
                      ) : "Seleccionar proyectos..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar proyectos..." />
                    <CommandEmpty>No se encontró ningún proyecto.</CommandEmpty>
                    <CommandGroup>
                      {projects?.map((project) => (
                        <CommandItem value={project.name} key={project.id} onSelect={() => {
                          const currentValues = field.value || [];
                          if (currentValues.includes(project.id)) {
                            field.onChange(currentValues.filter((id) => id !== project.id));
                          } else {
                            field.onChange([...currentValues, project.id]);
                          }
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", field.value?.includes(project.id) ? "opacity-100" : "opacity-0")} />
                          {project.name} ({project.code})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Cualquier detalle específico sobre esta solicitud..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Actualizar Detalles"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RequestMetadataForm;