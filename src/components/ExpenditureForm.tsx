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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Expenditure } from "@/data/types";
import { useProjects } from "@/hooks/use-projects";
import { useRequests } from "@/hooks/use-requests";
import { ExpenditureFormValues } from "@/hooks/use-expenditures";

const expenditureFormSchema = z.object({
  project_id: z.string().min(1, { message: "El proyecto es obligatorio." }),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, { message: "El monto debe ser mayor a cero." })
  ),
  description: z.string().min(1, { message: "La descripción es obligatoria." }),
  date_incurred: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha inválido (YYYY-MM-DD)." }),
  request_id: z.string().optional().nullable(),
});

interface ExpenditureFormProps {
  initialData?: Expenditure;
  onSubmit: (data: ExpenditureFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const ExpenditureForm: React.FC<ExpenditureFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();

  const form = useForm<ExpenditureFormValues>({
    resolver: zodResolver(expenditureFormSchema),
    defaultValues: initialData ? {
      project_id: initialData.project_id,
      amount: initialData.amount,
      description: initialData.description,
      date_incurred: initialData.date_incurred,
      request_id: initialData.request_id || null,
    } : {
      project_id: "",
      amount: 0,
      description: "",
      date_incurred: new Date().toISOString().split('T')[0], // Default to today
      request_id: null,
    },
  });

  const handleSubmit = (data: ExpenditureFormValues) => {
    onSubmit(data);
  };

  const isLoading = isLoadingProjects || isLoadingRequests;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proyecto / Centro de Costo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingProjects || isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProjects ? "Cargando proyectos..." : "Selecciona un proyecto"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.code} - {project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto (€)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="ej. 150.00" 
                    {...field} 
                    onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                    disabled={isSubmitting} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date_incurred"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha del Gasto</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="ej. Compra de reactivos para el proyecto X" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="request_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vincular a Solicitud (Opcional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value === "null-request" ? null : value)} 
                value={field.value || "null-request"} 
                disabled={isLoadingRequests || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRequests ? "Cargando solicitudes..." : "Selecciona una solicitud (ID)"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Usamos un valor de cadena no vacía para representar null */}
                  <SelectItem value="null-request">Sin Solicitud</SelectItem>
                  {requests?.map((req) => (
                    <SelectItem key={req.id} value={req.id}>
                      {req.request_number || req.id.substring(0, 8)} ({req.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
              </>
            ) : (
              initialData ? "Guardar Cambios" : "Registrar Gasto"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ExpenditureForm;