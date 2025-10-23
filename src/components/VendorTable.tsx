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

// Mock data for vendors
const mockVendors = [
  {
    id: "v1",
    name: "Thermo Fisher Scientific",
    contactPerson: "Jane Doe",
    email: "jane.doe@thermofisher.com",
    phone: "1-800-123-4567",
    notes: "Primary vendor for reagents and consumables.",
  },
  {
    id: "v2",
    name: "Sigma-Aldrich",
    contactPerson: "John Smith",
    email: "john.smith@sigmaaldrich.com",
    phone: "1-800-765-4321",
    notes: "Specializes in chemicals and custom synthesis.",
  },
  {
    id: "v3",
    name: "Bio-Rad Laboratories",
    contactPerson: "Emily White",
    email: "emily.white@bio-rad.com",
    phone: "1-800-987-6543",
    notes: "Equipment and kits for molecular biology.",
  },
  {
    id: "v4",
    name: "Qiagen",
    contactPerson: "David Green",
    email: "david.green@qiagen.com",
    phone: "1-800-234-5678",
    notes: "DNA/RNA purification and assay technologies.",
  },
];

const VendorTable: React.FC = () => {
  const handleEdit = (vendorId: string) => {
    console.log(`Edit vendor: ${vendorId}`);
    // Implement edit logic here (e.g., open a dialog/form)
  };

  const handleDelete = (vendorId: string) => {
    console.log(`Delete vendor: ${vendorId}`);
    // Implement delete logic here (e.g., show confirmation dialog)
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor Name</TableHead>
            <TableHead>Contact Person</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockVendors.map((vendor) => (
            <TableRow key={vendor.id}>
              <TableCell className="font-medium">{vendor.name}</TableCell>
              <TableCell>{vendor.contactPerson}</TableCell>
              <TableCell>{vendor.email}</TableCell>
              <TableCell>{vendor.phone}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(vendor.id)}
                  className="mr-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(vendor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default VendorTable;