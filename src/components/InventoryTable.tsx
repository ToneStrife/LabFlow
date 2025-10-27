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
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { InventoryItem } from "@/hooks/use-inventory";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
  selectedItems: string[];
  onSelectChange: (selectedIds: string[]) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onEdit, onDelete, selectedItems, onSelectChange }) => {
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange(items.map(item => item.id));
    } else {
      onSelectChange([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectChange([...selectedItems, itemId]);
    } else {
      onSelectChange(selectedItems.filter(id => id !== itemId));
    }
  };

  const isAllSelected = items.length > 0 && selectedItems.length === items.length;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < items.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Seleccionar todos"
                className={isIndeterminate ? "bg-primary" : ""}
              />
            </TableHead>
            <TableHead>Nombre del Producto</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Catálogo #</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Precio Unitario</TableHead>
            <TableHead className="hidden sm:table-cell">Formato</TableHead>
            <TableHead className="hidden sm:table-cell">Añadido el</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                No se encontraron artículos en el inventario.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const isSelected = selectedItems.includes(item.id);
              return (
                <TableRow key={item.id} data-state={isSelected && "selected"}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                      aria-label={`Seleccionar ${item.product_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.product_name}</TableCell>
                  <TableCell>{item.brand || "N/A"}</TableCell>
                  <TableCell>{item.catalog_number}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{item.format || "N/A"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{format(new Date(item.added_at), 'yyyy-MM-dd')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      className="mr-2"
                      title="Editar Artículo"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      title="Eliminar Artículo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTable;