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

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ items, onEdit, onDelete }) => {
  return (
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
            <TableHead>Añadido el</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No se encontraron artículos en el inventario.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.brand || "N/A"}</TableCell>
                <TableCell>{item.catalog_number}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                <TableCell>{item.format || "N/A"}</TableCell>
                <TableCell>{format(new Date(item.added_at), 'yyyy-MM-dd')}</TableCell>
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InventoryTable;