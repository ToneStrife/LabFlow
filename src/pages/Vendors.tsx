"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm, { VendorFormValues } from "@/components/VendorForm";
import { toast } from "sonner";
import { mockVendors, addVendor, updateVendor, deleteVendor, Vendor, subscribeToVendors } from "@/data/mockData"; // Import subscribeToVendors

const Vendors = () => {
  const [vendors, setVendors] = React.useState<Vendor[]>(mockVendors); // Initialize with current mock data
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<Vendor | undefined>(undefined);

  // Subscribe to changes in mockVendors
  React.useEffect(() => {
    const unsubscribe = subscribeToVendors(updatedVendors => {
      setVendors(updatedVendors);
    });
    return () => unsubscribe(); // Clean up subscription on unmount
  }, []);

  const parseBrandsString = (brandsString: string | undefined): string[] => {
    return brandsString
      ? brandsString.split(",").map((brand) => brand.trim()).filter(Boolean)
      : [];
  };

  const handleAddVendor = (newVendorData: VendorFormValues) => {
    addVendor({
      ...newVendorData,
      brands: parseBrandsString(newVendorData.brands),
    });
    setIsAddVendorDialogOpen(false);
    toast.success("Vendor added successfully!", {
      description: `Vendor: ${newVendorData.name}`,
    });
    // The setVendors in the useEffect will handle the re-render
  };

  const handleEditVendor = (vendorId: string, updatedData: VendorFormValues) => {
    updateVendor(vendorId, {
      ...updatedData,
      brands: parseBrandsString(updatedData.brands),
    });
    setIsEditVendorDialogOpen(false);
    setEditingVendor(undefined);
    toast.success("Vendor updated successfully!");
    // The setVendors in the useEffect will handle the re-render
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (deleteVendor(vendorId)) {
      toast.success("Vendor deleted successfully!");
      // The setVendors in the useEffect will handle the re-render
    }
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor({ ...vendor, brands: vendor.brands.join(", ") });
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
        onEdit={openEditDialog}
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