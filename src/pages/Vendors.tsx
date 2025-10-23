"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm, { VendorFormValues } from "@/components/VendorForm"; // Import the new VendorForm
import { toast } from "sonner";

// Define a type for a vendor
interface Vendor extends VendorFormValues {
  id: string;
}

// Mock data for vendors
const initialMockVendors: Vendor[] = [
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

const Vendors = () => {
  const [vendors, setVendors] = React.useState<Vendor[]>(initialMockVendors);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);

  const handleAddVendor = (newVendorData: VendorFormValues) => {
    const newVendor: Vendor = {
      id: `v${vendors.length + 1}`, // Simple ID generation for mock data
      ...newVendorData,
    };
    setVendors((prevVendors) => [...prevVendors, newVendor]);
    setIsAddVendorDialogOpen(false);
    toast.success("Vendor added successfully!", {
      description: `Vendor: ${newVendor.name}`,
    });
  };

  const handleEditVendor = (vendorId: string, updatedData: VendorFormValues) => {
    setVendors((prevVendors) =>
      prevVendors.map((vendor) =>
        vendor.id === vendorId ? { ...vendor, ...updatedData } : vendor
      )
    );
    toast.success("Vendor updated successfully!");
    // Close edit dialog if implemented
  };

  const handleDeleteVendor = (vendorId: string) => {
    setVendors((prevVendors) => prevVendors.filter((vendor) => vendor.id !== vendorId));
    toast.success("Vendor deleted successfully!");
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendor Directory</h1>
        <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <VendorForm onSubmit={handleAddVendor} onCancel={() => setIsAddVendorDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        This page allows account managers to view and manage vendor information.
      </p>
      <VendorTable
        vendors={vendors}
        onEdit={handleEditVendor}
        onDelete={handleDeleteVendor}
      />
    </div>
  );
};

export default Vendors;