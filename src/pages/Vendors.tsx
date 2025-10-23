"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm, { VendorFormValues } from "@/components/VendorForm";
import { toast } from "sonner";

// Define a type for a vendor, now including brands as an array of strings
interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  notes?: string;
  brands: string[]; // Brands are now an array of strings
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
    brands: ["Invitrogen", "Applied Biosystems", "Gibco"],
  },
  {
    id: "v2",
    name: "Sigma-Aldrich",
    contactPerson: "John Smith",
    email: "john.smith@sigmaaldrich.com",
    phone: "1-800-765-4321",
    notes: "Specializes in chemicals and custom synthesis.",
    brands: ["Sigma", "Aldrich", "Supelco"],
  },
  {
    id: "v3",
    name: "Bio-Rad Laboratories",
    contactPerson: "Emily White",
    email: "emily.white@bio-rad.com",
    phone: "1-800-987-6543",
    notes: "Equipment and kits for molecular biology.",
    brands: ["Bio-Rad"],
  },
  {
    id: "v4",
    name: "Qiagen",
    contactPerson: "David Green",
    email: "david.green@qiagen.com",
    phone: "1-800-234-5678",
    notes: "DNA/RNA purification and assay technologies.",
    brands: ["Qiagen"],
  },
];

const Vendors = () => {
  const [vendors, setVendors] = React.useState<Vendor[]>(initialMockVendors);
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<Vendor | undefined>(undefined);

  const parseBrandsString = (brandsString: string | undefined): string[] => {
    return brandsString
      ? brandsString.split(",").map((brand) => brand.trim()).filter(Boolean)
      : [];
  };

  const handleAddVendor = (newVendorData: VendorFormValues) => {
    const newVendor: Vendor = {
      id: `v${vendors.length + 1}`, // Simple ID generation for mock data
      ...newVendorData,
      brands: parseBrandsString(newVendorData.brands), // Parse brands string to array
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
        vendor.id === vendorId
          ? { ...vendor, ...updatedData, brands: parseBrandsString(updatedData.brands) }
          : vendor
      )
    );
    setIsEditVendorDialogOpen(false);
    setEditingVendor(undefined);
    toast.success("Vendor updated successfully!");
  };

  const handleDeleteVendor = (vendorId: string) => {
    setVendors((prevVendors) => prevVendors.filter((vendor) => vendor.id !== vendorId));
    toast.success("Vendor deleted successfully!");
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor({ ...vendor, brands: vendor.brands.join(", ") }); // Convert brands array to string for form
    setIsEditVendorDialogOpen(true);
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
        onEdit={openEditDialog} // Pass openEditDialog for editing
        onDelete={handleDeleteVendor}
      />

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditVendorDialogOpen} onOpenChange={setIsEditVendorDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          {editingVendor && (
            <VendorForm
              initialData={editingVendor}
              onSubmit={(data) => handleEditVendor(editingVendor.id, data)}
              onCancel={() => setIsEditVendorDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;