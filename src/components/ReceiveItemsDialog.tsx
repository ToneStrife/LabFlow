"use client";

import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, FileText } from "lucide-react";
import { SupabaseRequestItem } from "@/data/types";
import { useReceiveItems, useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { toast } from "sonner";

// Esquema para la cantidad recibida de un ítem
const receivedItemSchema = z.object({
  requestItemId: z.string(),
  productName: z.string(),
  quantityOrdered: z.number(),
  quantityPreviouslyReceived: z.number(),
  quantityReceived: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Quantity must be non-negative." })
  ),
});

// Esquema principal del formulario
const receiveFormSchema = z.object({
  slipNumber: z.string().min(1, { message: "Packing slip number is required." }),
  slipFile: z.any().optional(),
  items: z.array(receivedItemSchema).min(1),
});

type ReceiveFormValues = z.infer<typeof receiveFormSchema>;

interface ReceiveItemsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  requestItems: SupabaseRequestItem[];
}

const ReceiveItemsDialog: React.FC<ReceiveItemsDialogProps> = ({
  isOpen,
  onOpenChange,
  requestId,
  requestItems,
}) => {
  const { data: aggregatedReceived, isLoading: isLoadingReceived } = useAggregatedReceivedItems(requestId);
  const receiveItemsMutation = useReceiveItems();
  
  const initialItems = React.useMemo(() => {
    if (!requestItems || !aggregatedReceived) return [];

    return requestItems.map(item => {
      const previouslyReceived = aggregatedReceived.find(agg => agg.request_item_id === item.id)?.total_received || 0;
      const remaining = item.quantity - previouslyReceived;

      return {
        requestItemId: item.id,
        productName: item.product_name,
        quantityOrdered: item.quantity,
        quantityPreviouslyReceived: previouslyReceived,
        quantityReceived: remaining > 0 ? remaining : 0, // Sugerir la cantidad restante
      };
    });
  }, [requestItems, aggregatedReceived]);

  const form = useForm<ReceiveFormValues>({
    resolver: zodResolver(receiveFormSchema),
    defaultValues: {
      slipNumber: "",
      slipFile: undefined,
      items: initialItems,
    },
    values: { // Usar values para resetear cuando cambian las dependencias
      slipNumber: "",
      slipFile: undefined,
      items: initialItems,
    }
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = async (data: ReceiveFormValues) => {
    const itemsToReceive = data.items
      .filter(item => item.quantityReceived > 0)
      .map(item => {
        const orderedItem = requestItems.find(ri => ri.id === item.requestItemId);
        if (!orderedItem) throw new Error(`Item ${item.requestItemId} not found.`);
        
        const totalReceived = item.quantityPreviouslyReceived + item.quantityReceived;
        if (totalReceived > item.quantityOrdered) {
          toast.error(`Error: Quantity received for ${item.productName} exceeds quantity ordered.`);
          throw new Error("Quantity received exceeds quantity ordered.");
        }

        return {
          requestItemId: item.requestItemId,
          quantityReceived: item.quantityReceived,
          itemDetails: orderedItem,
        };
      });

    if (itemsToReceive.length === 0) {
      toast.error("Please specify at least one item quantity greater than zero to receive.");
      return;
    }

    const file = data.slipFile?.[0] || null;

    await receiveItemsMutation.mutateAsync({
      requestId,
      slipNumber: data.slipNumber,
      slipFile: file,
      items: itemsToReceive,
    });

    onOpenChange(false);
  };

  if (isLoadingReceived) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading received status...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isSubmitting = receiveItemsMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Receive Items & Record Packing Slip</DialogTitle>
          <DialogDescription>
            Enter the packing slip details and the quantity received for each item.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="slipNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Packing Slip Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SLIP-12345" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slipFile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Slip File (Optional)</FormLabel>
                    <FormControl>
                      <Input type="file" onChange={(e) => field.onChange(e.target.files)} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto p-2 border rounded-md">
              <h3 className="text-lg font-semibold">Items to Receive</h3>
              {fields.map((item, index) => {
                const quantityOrdered = form.watch(`items.${index}.quantityOrdered`);
                const quantityPreviouslyReceived = form.watch(`items.${index}.quantityPreviouslyReceived`);
                const quantityRemaining = quantityOrdered - quantityPreviouslyReceived;
                const isFullyReceived = quantityRemaining <= 0;

                return (
                  <div key={item.id} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center border-b pb-3 last:border-b-0">
                    <div className="sm:col-span-2">
                      <p className="font-medium truncate" title={item.productName}>{item.productName}</p>
                      <p className="text-xs text-muted-foreground">Ordered: {quantityOrdered} | Received: {quantityPreviouslyReceived}</p>
                    </div>
                    <div className="sm:col-span-1">
                      <p className="text-sm text-muted-foreground">Remaining:</p>
                      <p className={`font-bold ${isFullyReceived ? 'text-green-600' : 'text-orange-600'}`}>{quantityRemaining}</p>
                    </div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityReceived`}
                      render={({ field: quantityField }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Quantity to Receive</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0}
                              max={quantityRemaining}
                              {...quantityField} 
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                quantityField.onChange(val);
                              }}
                              disabled={isSubmitting || isFullyReceived}
                              className={isFullyReceived ? "bg-green-50/50" : ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...
                  </>
                ) : (
                  "Record Reception"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveItemsDialog;