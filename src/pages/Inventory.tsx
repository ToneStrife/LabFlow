"use client";

import React from "react";
import InventoryTable from "@/components/InventoryTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInventory, useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, InventoryItem } from "@/hooks/use-inventory";
import InventoryForm, { InventoryFormValues } from "@/components/InventoryForm"; // Importar el componente extraído

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
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Inventario...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error al cargar el inventario: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventario</h1>
        <Dialog open={isAddInventoryDialogOpen} onOpenChange={setIsAddInventoryDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Artículo al Inventario</DialogTitle>
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
        Gestiona el inventario de productos de tu laboratorio. Los artículos se añaden automáticamente aquí cuando una solicitud se marca como "Recibida".
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
            <DialogTitle>Editar Artículo de Inventario</DialogTitle>
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