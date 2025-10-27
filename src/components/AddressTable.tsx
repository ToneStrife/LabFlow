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
import { Address } from "@/data/types";

interface AddressTableProps {
  addresses: Address[];
  onEdit: (address: Address) => void;
  onDelete: (addressId: string) => void;
}

const AddressTable: React.FC<AddressTableProps> = ({ addresses, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Línea de Dirección 1</TableHead>
            <TableHead>Ciudad, Estado, CP</TableHead>
            <TableHead>País</TableHead>
            <TableHead>CIF / ID de IVA</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addresses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No se encontraron direcciones.
              </TableCell>
            </TableRow>
          ) : (
            addresses.map((address) => (
              <TableRow key={address.id}>
                <TableCell className="font-medium">{address.name}</TableCell>
                <TableCell>{address.address_line_1}</TableCell>
                <TableCell>{address.city}, {address.state}, {address.zip_code}</TableCell>
                <TableCell>{address.country}</TableCell>
                <TableCell>{address.cif || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(address)}
                    className="mr-2"
                    title="Editar Dirección"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(address.id)}
                    title="Eliminar Dirección"
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

export default AddressTable;