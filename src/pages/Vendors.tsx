import React from "react";
import VendorTable from "@/components/VendorTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCan } from "@/hooks/use-permissions";
import { Loader2, PlusCircle, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm from "@/components/VendorForm";
import { useVendors, useAddVendor, useUpdateVendor, useDeleteVendor, useVendorLabOverrides, VendorFormValues } from "@/hooks/use-vendors";
import { Vendor } from "@/data/types";
import { pageContainerClass, pageHeaderClass, mobileDialogClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useLabsCatalog } from "@/components/LabsCatalogProvider";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { getSedeById } from "@/lib/sedes";
import { vendorsVisibleForLab } from "@/lib/vendors";

interface EditingVendorData extends VendorFormValues {
  id: string;
}

function textoBuscable(vendor: Vendor): string {
  return [
    vendor.name,
    vendor.contact_person,
    vendor.email,
    vendor.email_presupuesto,
    vendor.email_pedido,
    vendor.phone,
    vendor.notes,
    ...(vendor.brands ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const Vendors = () => {
  const { data: vendors, isLoading, error } = useVendors();
  const addVendorMutation = useAddVendor();
  const updateVendorMutation = useUpdateVendor();
  const deleteVendorMutation = useDeleteVendor();
  const { can } = useCan();
  const puedeGestionar = can("vendors.manage");
  const { labs } = useLabsCatalog();
  const { sedeActiva } = useSedeActiva();
  const labActivoId = getSedeById(sedeActiva)?.lab_id ?? labs[0]?.id ?? null;
  const { data: overrides = [] } = useVendorLabOverrides(labActivoId);

  const [busqueda, setBusqueda] = React.useState("");
  const [isAddVendorDialogOpen, setIsAddVendorDialogOpen] = React.useState(false);
  const [isEditVendorDialogOpen, setIsEditVendorDialogOpen] = React.useState(false);
  const [editingVendorInitialData, setEditingVendorInitialData] = React.useState<
    EditingVendorData | undefined
  >(undefined);

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
    const initialData: EditingVendorData = {
      id: vendor.id,
      name: vendor.name,
      contact_person: vendor.contact_person || null,
      email: vendor.email || null,
      email_presupuesto: vendor.email_presupuesto ?? vendor.email ?? null,
      email_pedido: vendor.email_pedido ?? vendor.email ?? null,
      phone: vendor.phone || null,
      notes: vendor.notes || null,
      brands: vendor.brands && Array.isArray(vendor.brands) ? vendor.brands.join(", ") : null,
      scope: vendor.scope ?? "global",
      lab_id: vendor.lab_id ?? null,
    };
    setEditingVendorInitialData(initialData);
    setIsEditVendorDialogOpen(true);
  };

  const proveedoresFiltrados = React.useMemo(() => {
    const scoped = vendorsVisibleForLab(vendors, overrides, labActivoId);
    const lista = [...scoped].sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" })
    );
    const q = busqueda.trim().toLowerCase();
    if (!q) return lista;
    const tokens = q.split(/\s+/).filter(Boolean);
    return lista.filter((vendor) => {
      const haystack = textoBuscable(vendor);
      return tokens.every((token) => haystack.includes(token));
    });
  }, [vendors, overrides, labActivoId, busqueda]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 sm:p-6">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Cargando proveedores…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 sm:p-6 dark:text-red-400">
        Error al cargar proveedores: {error.message}
      </div>
    );
  }

  const total = vendors?.length ?? 0;
  const mostrando = proveedoresFiltrados.length;

  return (
    <div className={pageContainerClass}>
      <div className={cn(pageHeaderClass, "items-start sm:items-end")}>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proveedores</h1>
          <p className="text-sm text-muted-foreground">
            Contactos, correos de presupuesto/pedido y marcas del laboratorio.
          </p>
        </div>
        <Dialog open={isAddVendorDialogOpen} onOpenChange={setIsAddVendorDialogOpen}>
          <DialogTrigger asChild>
            <Button className={cn("shrink-0", !puedeGestionar && "hidden")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className={cn(mobileDialogClass, "sm:max-w-[480px]")}>
            <DialogHeader className="shrink-0">
              <DialogTitle>Añadir proveedor</DialogTitle>
            </DialogHeader>
            <div className="min-h-0 flex-1">
              <VendorForm
                onSubmit={handleAddVendor}
                onCancel={() => setIsAddVendorDialogOpen(false)}
                isSubmitting={addVendorMutation.isPending}
                labs={labs}
                defaultLabId={labActivoId}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="sticky top-14 z-30 space-y-2 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, marca, correo, teléfono o contacto…"
            className="h-11 pl-9 pr-10"
            aria-label="Buscar proveedores"
          />
          {busqueda ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
              onClick={() => setBusqueda("")}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {busqueda.trim()
            ? `${mostrando} de ${total} proveedor${total === 1 ? "" : "es"}`
            : `${total} proveedor${total === 1 ? "" : "es"}`}
        </p>
      </div>

      <VendorTable
        vendors={proveedoresFiltrados}
        onEdit={openEditDialog}
        onDelete={handleDeleteVendor}
        canManage={puedeGestionar}
        emptyMessage={
          busqueda.trim()
            ? "Ningún proveedor coincide con la búsqueda."
            : "Todavía no hay proveedores. Añade el primero."
        }
      />

      <Dialog open={isEditVendorDialogOpen} onOpenChange={setIsEditVendorDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[480px]")}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Editar proveedor</DialogTitle>
          </DialogHeader>
          {editingVendorInitialData && (
            <div className="min-h-0 flex-1">
              <VendorForm
                initialData={editingVendorInitialData}
                onSubmit={(data) => handleEditVendor(editingVendorInitialData.id, data)}
                onCancel={() => setIsEditVendorDialogOpen(false)}
                isSubmitting={updateVendorMutation.isPending}
                labs={labs}
                defaultLabId={labActivoId}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Vendors;
