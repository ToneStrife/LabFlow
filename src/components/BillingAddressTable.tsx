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
import { BillingAddress } from "@/data/types";

interface BillingAddressTableProps {
  addresses: BillingAddress[];
  onEdit: (address: BillingAddress) => void;
  onDelete: (addressId: string) => void;
}

const BillingAddressTable: React.FC<BillingAddressTableProps> = ({ addresses, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {addresses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                No billing addresses found.
              </TableCell>
            </TableRow>
          ) : (
            addresses.map((address) => (
              <TableRow key={address.id}>
                <TableCell className="font-medium">{address.name}</TableCell>
                <TableCell>{`${address.address_line_1}, ${address.city}, ${address.state} ${address.zip_code}`}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(address)}
                    className="mr-2"
                    title="Edit Address"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(address.id)}
                    title="Delete Address"
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

export default BillingAddressTable;