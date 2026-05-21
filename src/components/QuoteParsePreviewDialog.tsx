"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ParsedQuoteItem } from "@/data/quote-parse";
import { mobileDialogClass, dialogBodyScrollClass, dialogFooterMobileClass } from "@/lib/layout";
import { cn } from "@/lib/utils";

interface QuoteParsePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ParsedQuoteItem[];
  onConfirm: () => void;
}

const QuoteParsePreviewDialog: React.FC<QuoteParsePreviewDialogProps> = ({
  open,
  onOpenChange,
  items,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(mobileDialogClass, "sm:max-w-3xl gap-0 p-4 sm:p-6")}>
        <DialogHeader className="shrink-0">
          <DialogTitle>Productos detectados en el PDF</DialogTitle>
          <DialogDescription>
            Revisa los datos antes de reemplazar los artículos del formulario. La IA puede
            equivocarse en PDFs escaneados o tablas complejas.
          </DialogDescription>
        </DialogHeader>

        <div className={cn(dialogBodyScrollClass, "py-2")}>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Catálogo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Marca</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-[200px] truncate" title={item.productName}>
                      {item.productName}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" title={item.catalogNumber}>
                      {item.catalogNumber}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate">{item.brand ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {items.length} {items.length === 1 ? "línea detectada" : "líneas detectadas"}. Se
            reemplazarán todos los artículos actuales del formulario.
          </p>
        </div>

        <DialogFooter className={dialogFooterMobileClass}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} className="w-full sm:w-auto">
            Reemplazar artículos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteParsePreviewDialog;
