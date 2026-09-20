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
import { cn } from "@/lib/utils";

interface InventoryTableProps {
  items: InventoryItem[];
  onEdit: (item: InventoryItem) => void;
  onDelete: (itemId: string) => void;
  selectedItems: string[];
  onSelectChange: (selectedIds: string[]) => void;
}

function quantityClass(quantity: number) {
  if (quantity <= 0) return "text-red-600 dark:text-red-400 font-semibold";
  if (quantity <= 2) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "";
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEdit,
  onDelete,
  selectedItems,
  onSelectChange,
}) => {
  const pageIds = items.map((item) => item.id);
  const selectedOnPage = pageIds.filter((id) => selectedItems.includes(id));
  const isAllSelected = items.length > 0 && selectedOnPage.length === items.length;
  const isIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < items.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectChange([...new Set([...selectedItems, ...pageIds])]);
    } else {
      const remove = new Set(pageIds);
      onSelectChange(selectedItems.filter((id) => !remove.has(id)));
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      onSelectChange([...selectedItems, itemId]);
    } else {
      onSelectChange(selectedItems.filter((id) => id !== itemId));
    }
  };

  return (
    <div>
      {items.length > 0 && (
        <div className="flex items-center gap-2 border-b px-3 py-1.5 md:hidden">
          <Checkbox
            checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
            onCheckedChange={(checked) => handleSelectAll(checked === true)}
            aria-label="Seleccionar todos en esta página"
          />
          <span className="text-xs text-muted-foreground">Seleccionar esta página</span>
        </div>
      )}
      <div className="md:hidden divide-y">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No se encontraron artículos en el inventario.
          </p>
        ) : (
          items.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            return (
              <div
                key={item.id}
                className={cn("flex items-center gap-2 px-3 py-2", isSelected && "bg-muted/50")}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                  aria-label={`Seleccionar ${item.product_name}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.product_name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.catalog_number}
                    {item.brand ? ` · ${item.brand}` : ""}
                    {item.location ? ` · ${item.location}` : ""}
                  </p>
                </div>
                <span className={cn("shrink-0 text-sm tabular-nums", quantityClass(item.quantity))}>
                  {item.quantity}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onEdit(item)} title="Editar artículo">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(item.id)}
                  title="Eliminar artículo"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block">
        <Table className="[&_th]:h-9 [&_th]:px-3 [&_td]:px-3 [&_td]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label="Seleccionar todos en esta página"
                />
              </TableHead>
              <TableHead>Nombre del Producto</TableHead>
              <TableHead className="hidden sm:table-cell">Marca</TableHead>
              <TableHead>Catálogo #</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead className="hidden sm:table-cell">Ubicación</TableHead>
              <TableHead className="hidden md:table-cell">Precio Unitario</TableHead>
              <TableHead className="hidden lg:table-cell">Formato</TableHead>
              <TableHead className="hidden lg:table-cell">Añadido el</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No se encontraron artículos en el inventario.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                return (
                  <TableRow key={item.id} data-state={isSelected ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        aria-label={`Seleccionar ${item.product_name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{item.brand || "N/A"}</TableCell>
                    <TableCell>{item.catalog_number}</TableCell>
                    <TableCell className={cn("tabular-nums", quantityClass(item.quantity))}>
                      {item.quantity}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{item.location || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.unit_price ? `€${Number(item.unit_price).toFixed(2)}` : "N/A"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{item.format || "N/A"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {format(new Date(item.added_at), "yyyy-MM-dd")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)} title="Editar Artículo">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
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
    </div>
  );
};

export default InventoryTable;
