"use client";

import React from "react";
import InventoryTable from "@/components/InventoryTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useInventory, useAddInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, InventoryItem } from "@/hooks/use-inventory";
import InventoryForm, { InventoryFormValues } from "@/components/InventoryForm";
import InventoryToolbar from "@/components/InventoryToolbar"; // Importar Toolbar
import ReorderDialog from "@/components/ReorderDialog"; // Importar ReorderDialog

const Inventory = () => {
  const { data: inventoryItems, isLoading, error } = useInventory();
  const addInventoryItemMutation = useAddInventoryItem();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();

  const [isAddInventoryDialogOpen, setIsAddInventoryDialogOpen] = React.useState(false);
  const [isEditInventoryDialogOpen, setIsEditInventoryDialogOpen] = React.useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = React.useState<InventoryItem | undefined>(undefined);
  
  // Estados para búsqueda y reorder
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
  const [isReorderDialogOpen, setIsReorderDialogOpen] = React.useState(false);

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
  
  const handleReorder = () => {
    if (selectedItems.length > 0) {
      setIsReorderDialogOpen(true);
    }
  };

  // Filtrado de ítems
  const filteredItems = React.useMemo(() => {
    if (!inventoryItems) return [];
    const lowerCaseSearch = searchTerm.toLowerCase();
    return inventoryItems.filter(item => 
      item.product_name.toLowerCase().includes(lowerCaseSearch) ||
      item.catalog_number.toLowerCase().includes(lowerCaseSearch) ||
      (item.brand && item.brand.toLowerCase().includes(lowerCaseSearch))
    );
  }, [inventoryItems, searchTerm]);
  
  // Ítems seleccionados para reorder
  const itemsToReorder = React.useMemo(() => {
    return inventoryItems?.filter(item => selectedItems.includes(item.id)) || [];
  }, [inventoryItems, selectedItems]);


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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
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
        Gestiona el inventario de productos de tu laboratorio.
      </p>
      
      <InventoryToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedItemCount={selectedItems.length}
        onReorder={handleReorder}
      />
      
      <div className="mt-6">
        <InventoryTable
          items={filteredItems}
          onEdit={openEditDialog}
          onDelete={handleDeleteInventoryItem}
          selectedItems={selectedItems}
          onSelectChange={setSelectedItems}
        />
      </div>

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
      
      {/* Reorder Dialog */}
      {itemsToReorder.length > 0 && (
        <ReorderDialog
          isOpen={isReorderDialogOpen}
          onOpenChange={(open) => {
            setIsReorderDialogOpen(open);
            if (!open) setSelectedItems([]); // Limpiar selección al cerrar
          }}
          items={itemsToReorder}
        />
      )}
    </div>
  );
};

export default Inventory;