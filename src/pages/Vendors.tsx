"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm from "@/components/VendorForm";
import { useVendors, useAddVendor, useUpdateVendor, useDeleteVendor, Vendor } from "@/hooks/use-vendors";
import { toast } from "sonner";

const Vendors = () => {
  const { data: vendors, isLoading, error } = useVendors();
  const addVendorMutation = useAddVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();

  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<Vendor | undefined>(undefined);

  const parseBrandsString = (brandsString: string | undefined): string[] => {
    return brandsString
      ? brandsString.split(",").map((brand) => brand.trim()).filter(Boolean)
      : [];
  };

  const handleAddVendor = async (newVendorData: any) => { // Changed type to any for now to avoid immediate type errors
    await addVendorMutation.mutateAsync({
      ...newVendorData,
      brands: parseBrandsString(newVendorData.brands),
    });
    setIsAddVendorDialogOpen(false);
  };

  const handleEditVendor = async (vendorId: string, updatedData: any) => { // Changed type to any for now
    await updateVendorMutation.mutateAsync({
      id: vendorId,
      data: {
        ...updatedData,
        brands: parseBrandsString(updatedData.brands),
      },
    });
    setIsEditVendorDialogOpen(false);
    setEditingVendor(undefined);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    await deleteVendorMutation.mutateAsync(vendorId);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor({ 
      ...vendor, 
      brands: vendor.brands?.join(", ") || "",
      contact_person: vendor.contact_person || null, // Ensure contact_person is correctly mapped
    });
    setIsEditVendorDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Proveedores...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error al cargar proveedores: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Directorio de Proveedores</h1>
        <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Añadir Nuevo Proveedor</DialogTitle>
            </DialogHeader>
            <VendorForm
              onSubmit={handleAddVendor}
              onCancel={() => setIsAddVendorDialogOpen(false)}
              isSubmitting={addVendorMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Esta página permite a los gerentes de cuenta ver y gestionar la información de los proveedores.
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
            <DialogTitle>Editar Proveedor</DialogTitle>
          </DialogHeader>
          {editingVendor && (
            <VendorForm
              initialData={{ 
                ...editingVendor, 
                brands: editingVendor.brands?.join(", ") || "",
                contact_person: editingVendor.contact_person || null, // Ensure correct mapping for initialData
              }}
              onSubmit={(data) => handleEditVendor(editingVendor.id, data)}
              onCancel={() => setIsEditVendorDialogOpen(false)}
              isSubmitting={updateVendorMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;