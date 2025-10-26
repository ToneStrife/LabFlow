"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight } from "lucide-react";
import { SupabaseRequest, useRequests, useDeleteRequest } from "@/hooks/use-requests";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const mergeSchema = z.object({
  targetRequestId: z.string().min(1, { message: "La solicitud de destino es obligatoria." }),
});

type MergeFormValues = z.infer<typeof mergeSchema>;

interface MergeRequestsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRequest: SupabaseRequest;
  mergeableRequests: SupabaseRequest[];
}

// --- Custom Hook para la lógica de fusión ---
const useMergeRequests = () => {
  const queryClient = useQueryClient();
  const deleteRequestMutation = useDeleteRequest();

  return useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      // 1. Mover todos los ítems de la solicitud de origen a la solicitud de destino
      const { error: updateError } = await supabase
        .from('request_items')
        .update({ request_id: targetId })
        .eq('request_id', sourceId);

      if (updateError) {
        throw new Error(`Fallo al mover ítems: ${updateError.message}`);
      }

      // 2. Eliminar la solicitud de origen (esto también eliminará los ítems si la FK no se actualizó correctamente, pero ya lo hicimos manualmente)
      await deleteRequestMutation.mutateAsync(sourceId);
      
      return { targetId };
    },
    onSuccess: ({ targetId }) => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast.success("Solicitudes fusionadas exitosamente!", {
        description: `Los ítems se movieron a la Solicitud ${targetId.substring(0, 8)}.`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al fusionar solicitudes.", {
        description: error.message,
      });
    },
  });
};
// -------------------------------------------

const MergeRequestsDialog: React.FC<MergeRequestsDialogProps> = ({
  isOpen,
  onOpenChange,
  sourceRequest,
  mergeableRequests,
}) => {
  const mergeMutation = useMergeRequests();
  const isSubmitting = mergeMutation.isPending;

  const form = useForm<MergeFormValues>({
    resolver: zodResolver(mergeSchema),
    defaultValues: {
      targetRequestId: "",
    },
  });

  const handleSubmit = async (data: MergeFormValues) => {
    await mergeMutation.mutateAsync({
      sourceId: sourceRequest.id,
      targetId: data.targetRequestId,
    });
    onOpenChange(false);
  };

  const sourceRequestNumber = sourceRequest.request_number || sourceRequest.id.substring(0, 8);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fusionar Solicitudes</DialogTitle>
          <DialogDescription>
            Mover todos los artículos de la Solicitud <span className="font-bold text-primary">{sourceRequestNumber}</span> a otra solicitud del mismo proveedor.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
                <span className="font-medium text-sm">{sourceRequestNumber}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <FormField
                  control={form.control}
                  name="targetRequestId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Solicitud de Destino</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona solicitud de destino" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mergeableRequests.map((req) => (
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
            </div>
            
            <p className="text-sm text-red-500">
              Advertencia: La Solicitud {sourceRequestNumber} será eliminada después de mover sus artículos.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || mergeableRequests.length === 0}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fusionando...
                  </>
                ) : (
                  "Confirmar Fusión"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MergeRequestsDialog;