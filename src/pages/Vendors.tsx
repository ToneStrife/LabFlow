"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm, { VendorFormValues } from "@/components/VendorForm";
import { useVendors, useAddVendor, useUpdateVendor, useDeleteVendor, Vendor } from "@/hooks/use-vendors"; // Import Supabase hooks

const Vendors = () => {
  const { data: vendors, isLoading, error } = useVendors();
  const addVendorMutation = useAddVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();

  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<VendorFormValues & { id: string } | undefined>(undefined);

  const handleAddVendor = (newVendorData: VendorFormValues) => {
    addVendorMutation.mutate(newVendorData);
    setIsAddVendorDialogOpen(false);
  };

  const handleEditVendor = (vendorId: string, updatedData: VendorFormValues) => {
    updateVendorMutation.mutate({ id: vendorId, data: updatedData });
    setIsEditVendorDialogOpen(false);
    setEditingVendor(undefined);
  };

  const handleDeleteVendor = (vendorId: string) => {
    deleteVendorMutation.mutate(vendorId);
  };

  const openEditDialog = (vendor: Vendor) => {
    // Convert DB format (brands array) to Form format (brands string)
    setEditingVendor({
      id: vendor.id,
      name: vendor.name,
      contactPerson: vendor.contact_person || undefined,
      email: vendor.email || undefined,
      phone: vendor.phone || undefined,
      notes: vendor.notes || undefined,
      brands: vendor.brands ? vendor.brands.join(", ") : undefined,
    });
    setIsEditVendorDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Vendors...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading vendors: {error.message}
      </div>
    );
  }

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
        vendors={vendors || []}
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