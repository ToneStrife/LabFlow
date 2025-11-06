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
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { useCorrectReceivedItemQuantity } from "@/hooks/use-packing-slips";
import { toast } from "sonner";

const editReceivedItemSchema = z.object({
  receivedItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  oldQuantity: z.number(),
  newQuantity: z.preprocess(
    (val) => Number(val),
    z.number().int({ message: "La cantidad debe ser un número entero." }).min(0, { message: "La cantidad no puede ser negativa." })
  ),
});

type EditReceivedItemFormValues = z.infer<typeof editReceivedItemSchema>;

interface EditReceivedItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemData: {
    receivedItemId: string;
    productName: string;
    quantityOrdered: number;
    oldQuantity: number;
  } | null;
}

const EditReceivedItemDialog: React.FC<EditReceivedItemDialogProps> = ({
  isOpen,
  onOpenChange,
  itemData,
}) => {
  const correctQuantityMutation = useCorrectReceivedItemQuantity();
  const isSubmitting = correctQuantityMutation.isPending;

  const form = useForm<EditReceivedItemFormValues>({
    resolver: zodResolver(editReceivedItemSchema),
    defaultValues: itemData || undefined,
    values: itemData || undefined,
  });

  const handleSubmit = async (data: EditReceivedItemFormValues) => {
    if (data.newQuantity > data.quantityOrdered) {
        toast.error("Error de corrección", { description: `La cantidad total recibida (${data.newQuantity}) no puede exceder la cantidad pedida (${data.quantityOrdered}).` });
        return;
    }
    
    if (data.newQuantity === data.oldQuantity) {
        toast.info("No hay cambios para guardar.");
        onOpenChange(false);
        return;
    }

    await correctQuantityMutation.mutateAsync({
      receivedItemId: data.receivedItemId,
      newQuantity: data.newQuantity,
    });
    onOpenChange(false);
  };

  if (!itemData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Corregir Cantidad Recibida</DialogTitle>
          <DialogDescription>
            Ajusta la cantidad recibida para este ítem en este albarán. El inventario se ajustará automáticamente por la diferencia.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
                <Label>Producto</Label>
                <Input value={itemData.productName} disabled />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Cantidad Pedida</Label>
                    <Input value={itemData.quantityOrdered} disabled />
                </div>
                <div className="space-y-2">
                    <Label>Cantidad Registrada (Original)</Label>
                    <Input value={itemData.oldQuantity} disabled />
                </div>
            </div>
            
            <FormField
              control={form.control}
              name="newQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva Cantidad Recibida</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0}
                      max={itemData.quantityOrdered}
                      {...field} 
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      disabled={isSubmitting} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar Corrección
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReceivedItemDialog;