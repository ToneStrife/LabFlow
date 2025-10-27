"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupabaseRequestItem } from "@/data/types";
import RequestItemForm, { ItemEditFormValues } from "./RequestItemForm";
import { useUpdateRequestItem, useDeleteRequestItem } from "@/hooks/use-request-items";
import { toast } from "sonner";

interface RequestItemsTableProps {
  items: SupabaseRequestItem[] | null;
  isEditable: boolean;
}

const RequestItemsTable: React.FC<RequestItemsTableProps> = ({ items, isEditable }) => {
  const updateItemMutation = useUpdateRequestItem();
  const deleteItemMutation = useDeleteRequestItem();

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<SupabaseRequestItem | undefined>(undefined);

  const handleEditItem = (item: SupabaseRequestItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };

  const handleUpdateItem = async (data: ItemEditFormValues) => {
    if (!editingItem) return;
    await updateItemMutation.mutateAsync({ id: editingItem.id, data });
    setIsEditDialogOpen(false);
    setEditingItem(undefined);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (items && items.length <= 1) {
      toast.error("No se puede eliminar el último artículo.", { description: "Una solicitud debe tener al menos un artículo. Considere eliminar la solicitud completa en su lugar." });
      return;
    }
    await deleteItemMutation.mutateAsync(itemId);
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        No se encontraron artículos para esta solicitud.
      </div>
    );
  }

  return (
    <>
      <Separator />
      <h2 className="text-xl font-semibold mb-4">Artículos Solicitados</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Producto</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Catálogo #</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Precio Unitario</TableHead>
              <TableHead>Formato</TableHead>
              <TableHead>Enlace</TableHead>
              {isEditable && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.brand || "N/A"}</TableCell>
                <TableCell>{item.catalog_number || "N/A"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                <TableCell>{item.format || "N/A"}</TableCell>
                <TableCell>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      Ver Producto
                    </a>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                {isEditable && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditItem(item)}
                      className="mr-2"
                      title="Editar Artículo"
                      disabled={updateItemMutation.isPending || deleteItemMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Eliminar Artículo"
                      disabled={updateItemMutation.isPending || deleteItemMutation.isPending}
                    >
                      {deleteItemMutation.isPending && deleteItemMutation.variables === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Artículo de Solicitud</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <RequestItemForm
              initialData={editingItem}
              onSubmit={handleUpdateItem}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={updateItemMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestItemsTable;