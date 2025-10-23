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
import { VendorFormValues } from "./VendorForm";

// Define a type for a vendor (matching VendorFormValues plus an ID and brands array)
interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  notes?: string;
  brands: string[]; // Brands are now an array of strings
}

interface VendorTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void; // Changed to pass the full vendor object
  onDelete: (vendorId: string) => void;
}

const VendorTable: React.FC<VendorTableProps> = ({ vendors, onEdit, onDelete }) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Brands</TableHead> {/* New column for Brands */}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground"> {/* Updated colspan */}
                No vendors found.
              </TableCell>
            </TableRow>
          ) : (
            vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell className="font-medium">{vendor.name}</TableCell>
                <TableCell>{vendor.contactPerson || "N/A"}</TableCell>
                <TableCell>{vendor.email || "N/A"}</TableCell>
                <TableCell>{vendor.phone || "N/A"}</TableCell>
                <TableCell>{vendor.brands.length > 0 ? vendor.brands.join(", ") : "N/A"}</TableCell> {/* Display brands */}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(vendor)} // Pass the full vendor object for editing
                    className="mr-2"
                    title="Edit Vendor"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(vendor.id)}
                    title="Delete Vendor"
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

export default VendorTable;