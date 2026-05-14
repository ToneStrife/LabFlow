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
import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupabaseRequestItem } from "@/data/types";
import RequestItemForm, { ItemEditFormValues } from "./RequestItemForm";
import { useUpdateRequestItem, useDeleteRequestItem } from "@/hooks/use-request-items";
import { useAggregatedReceivedItems } from "@/hooks/use-packing-slips";
import { useAggregatedInvoicedItems } from "@/hooks/use-invoices";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/SessionContextProvider";
import { cn } from "@/lib/utils";

interface RequestItemsTableProps {
  items: SupabaseRequestItem[] | null;
  isEditable: boolean;
}

const RequestItemsTable: React.FC<RequestItemsTableProps> = ({ items, isEditable }) => {
  const { profile } = useSession();
  const isAdmin = profile?.role === 'Admin';
  const requestId = items?.[0]?.request_id || '';
  
  const updateItemMutation = useUpdateRequestItem();
  const deleteItemMutation = useDeleteRequestItem();
  const { data: receivedData } = useAggregatedReceivedItems(requestId);
  const { data: invoicedData } = useAggregatedInvoicedItems(requestId);

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
      toast.error("No se puede eliminar el último artículo.");
      return;
    }
    await deleteItemMutation.mutateAsync(itemId);
  };

  if (!items || items.length === 0) return null;

  return (
    <>
      <Separator />
      <h2 className="text-xl font-semibold mb-4">Artículos Solicitados</h2>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Pedido</TableHead>
              <TableHead className="text-center">Recibido</TableHead>
              {isAdmin && <TableHead className="text-center">Facturado</TableHead>}
              <TableHead>Precio</TableHead>
              {isEditable && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const received = receivedData?.find(r => r.request_item_id === item.id)?.total_received || 0;
              const invoiced = invoicedData?.find(i => i.request_item_id === item.id)?.total_invoiced || 0;
              
              const isFullyInvoiced = invoiced >= item.quantity;
              const isFullyReceived = received >= item.quantity;

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                        <span>{item.product_name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.catalog_number}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                        variant={isFullyReceived ? "secondary" : "outline"} 
                        className={cn("gap-1", isFullyReceived ? "bg-green-600 text-white hover:bg-green-700" : "")}
                    >
                        {received} {isFullyReceived && <CheckCircle2 className="h-3 w-3" />}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-center">
                        <Badge 
                            variant={isFullyInvoiced ? "secondary" : "outline"} 
                            className={cn("gap-1", isFullyInvoiced ? "bg-blue-600 text-white hover:bg-blue-700" : "")}
                        >
                            {invoiced} {isFullyInvoiced && <CheckCircle2 className="h-3 w-3" />}
                        </Badge>
                    </TableCell>
                  )}
                  <TableCell>{item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                  {isEditable && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} className="mr-1"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><DialogTitle>Editar Artículo</DialogTitle></DialogHeader>
          {editingItem && <RequestItemForm initialData={editingItem} onSubmit={handleUpdateItem} onCancel={() => setIsEditDialogOpen(false)} isSubmitting={updateItemMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RequestItemsTable;