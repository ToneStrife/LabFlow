"use client";

import React from "react";
import InventoryTable from "@/components/InventoryTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInventory, useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, InventoryItem } from "@/hooks/use-inventory";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const inventoryFormSchema = z.object({
  product_name: z.string().min(1, { message: "Product name is required." }),
  catalog_number: z.string().min(1, { message: "Catalog number is required." }),
  brand: z.string().optional().nullable(),
  quantity: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Quantity cannot be negative." })
  ),
  unit_price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: "Unit price cannot be negative." }).nullable().optional()
  ),
  format: z.string().optional().nullable(),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

interface InventoryFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: InventoryFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: initialData ? {
      product_name: initialData.product_name,
      catalog_number: initialData.catalog_number,
      brand: initialData.brand,
      quantity: initialData.quantity,
      unit_price: initialData.unit_price,
      format: initialData.format,
    } : {
      product_name: "",
      catalog_number: "",
      brand: null,
      quantity: 0,
      unit_price: null,
      format: null,
    },
  });

  const handleSubmit = (data: InventoryFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="product_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Anti-GFP Antibody" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Invitrogen" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="catalog_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catalog Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 18265017" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price (Optional)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 120.50" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Format (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 200pack 8cs of 25" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              initialData ? "Save Changes" : "Add Item"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};


const Inventory = () => {
  const { data: inventoryItems, isLoading, error } = useInventory();
  const addInventoryItemMutation = useAddInventoryItem();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();

  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = React.useState(false);
  const [isEditInventoryDialogOpen, setIsEditInventoryDialogOpen] = React.useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = React.useState<InventoryItem | undefined>(undefined);

  const handleAddInventoryItem = async (newItemData: InventoryFormValues) => {
    await addInventoryItemMutation.mutateAsync(newItemData);
    setIsAddInventoryDialogOpen(false);
  };

  const handleEditInventoryItem = async (itemId: string, updatedData: InventoryFormValues) => {
    await updateInventoryItemMutation.mutateAsync({ id: itemId, data: updatedData });
    setIsEditInventoryDialogOpen(false);
    setEditingInventoryItem(undefined);
  };

  const handleDeleteInventoryItem = async (itemId: string) => {
    await deleteInventoryItemMutation.mutateAsync(itemId);
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingInventoryItem(item);
    setIsEditInventoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Inventory...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading inventory: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Dialog open={isAddInventoryDialogOpen} onOpenChange={setIsAddInventoryDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
            </DialogHeader>
            <InventoryForm
              onSubmit={handleAddInventoryItem}
              onCancel={() => setIsAddInventoryDialogOpen(false)}
              isSubmitting={addInventoryItemMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Manage your lab product inventory. Items are automatically added here when a request is marked as "Ordered".
      </p>
      <InventoryTable
        items={inventoryItems || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteInventoryItem}
      />

      {/* Edit Inventory Item Dialog */}
      <Dialog open={isEditInventoryDialogOpen} onOpenChange={setIsEditInventoryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingInventoryItem && (
            <InventoryForm
              initialData={editingInventoryItem}
              onSubmit={(data) => handleEditInventoryItem(editingInventoryItem.id, data)}
              onCancel={() => setIsEditInventoryDialogOpen(false)}
              isSubmitting={updateInventoryItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;