"use client";

import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm from "@/components/VendorForm";
import { useVendors, useAddVendor, useUpdateVendor, useDeleteVendor, VendorFormValues } from "@/hooks/use-vendors";
import { Vendor } from "@/data/types"; // Corrected import
import { toast } from "sonner";

// Definir un tipo que incluya el ID para el estado de edición
interface EditingVendorData extends VendorFormValues {
  id: string;
}

const Vendors = () => {
  const { data: vendors, isLoading, error } = useVendors();
  const addVendorMutation = useAddVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();

  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  // Cambiado el tipo de estado para incluir el ID
  const [editingVendorInitialData, setEditingVendorInitialData] = React.useState<EditingVendorData | undefined>(undefined);

  // NOTE: parseBrandsString is now handled inside use-vendors.ts mutations.
  // We only need to map the array back to a string for the form's initial data.

  const handleAddVendor = async (newVendorData: VendorFormValues) => {
    await addVendorMutation.mutateAsync(newVendorData);
    setIsAddVendorDialogOpen(false);
  };

  const handleEditVendor = async (vendorId: string, updatedData: VendorFormValues) => {
    await updateVendorMutation.mutateAsync({
      id: vendorId,
      data: updatedData,
    });
    setIsEditVendorDialogOpen(false);
    setEditingVendorInitialData(undefined);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    await deleteVendorMutation.mutateAsync(vendorId);
  };

  const openEditDialog = (vendor: Vendor) => {
    // Mapear el tipo Vendor (con brands: string[] | null) al tipo EditingVendorData
    const initialData: EditingVendorData = { 
      id: vendor.id, // Incluir el ID
      name: vendor.name,
      contact_person: vendor.contact_person || null,
      email: vendor.email || null,
      phone: vendor.phone || null,
      notes: vendor.notes || null,
      // Conversión de array a string para el formulario
      brands: vendor.brands && Array.isArray(vendor.brands) ? vendor.brands.join(", ") : null,
    };
    setEditingVendorInitialData(initialData);
    setIsEditVendorDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Proveedores...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 text-red-600">
        Error al cargar proveedores: {error.message}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
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
          {editingVendorInitialData && (
            <VendorForm
              // Pasamos solo los datos del formulario (sin ID)
              initialData={editingVendorInitialData}
              // Usamos el ID almacenado en el estado para la mutación
              onSubmit={(data) => handleEditVendor(editingVendorInitialData.id, data)}
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