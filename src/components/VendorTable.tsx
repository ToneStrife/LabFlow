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
import { Vendor } from "@/data/types";

interface VendorTableProps {
  vendors: Vendor[];
  /** vendors.manage: sin esto la lista es de solo lectura. */
  canManage: boolean;
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendorId: string) => void;
}

const marcasDe = (vendor: Vendor) =>
  vendor.brands && vendor.brands.length > 0 ? vendor.brands.join(", ") : "N/A";

const Acciones: React.FC<{ vendor: Vendor; onEdit: (vendor: Vendor) => void; onDelete: (vendorId: string) => void }> = ({
  vendor,
  onEdit,
  onDelete,
}) => (
  <>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => onEdit(vendor)}
      className="mr-2"
      title="Editar proveedor"
    >
      <Edit className="h-4 w-4" />
    </Button>
    <Button
      type="button"
      variant="destructive"
      size="icon"
      onClick={() => onDelete(vendor.id)}
      title="Eliminar proveedor"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </>
);

const VendorTable: React.FC<VendorTableProps> = ({ vendors, canManage, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <div className="md:hidden divide-y">
        {vendors.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No se encontraron proveedores.
          </p>
        ) : (
          vendors.map((vendor) => (
            <div key={vendor.id} className="flex items-start gap-2 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{vendor.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {vendor.contact_person || "Sin contacto"}
                  {vendor.email ? ` · ${vendor.email}` : ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {vendor.phone || "Sin teléfono"}
                  {` · ${marcasDe(vendor)}`}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0">
                  <Acciones vendor={vendor} onEdit={onEdit} onDelete={onDelete} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Proveedor</TableHead>
              <TableHead>Persona de Contacto</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Marcas</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center text-muted-foreground">
                  No se encontraron proveedores.
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell>{vendor.contact_person || "N/A"}</TableCell>
                  <TableCell>{vendor.email || "N/A"}</TableCell>
                  <TableCell>{vendor.phone || "N/A"}</TableCell>
                  <TableCell>{marcasDe(vendor)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Acciones vendor={vendor} onEdit={onEdit} onDelete={onDelete} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VendorTable;
