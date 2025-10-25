"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Projects
import ProjectTable from "@/components/ProjectTable";
import ProjectForm, { ProjectFormValues } from "@/components/ProjectForm";
import { useProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/data/types";

// Account Managers
import AccountManagerTable from "@/components/AccountManagerTable";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagers, useAddAccountManager, useUpdateAccountManager, useDeleteAccountManager } from "@/hooks/use-account-managers";
import { AccountManager } from "@/data/types";

// Shipping Addresses
import ShippingAddressTable from "@/components/ShippingAddressTable";
import ShippingAddressForm from "@/components/ShippingAddressForm";
import { useShippingAddresses, useAddShippingAddress, useUpdateShippingAddress, useDeleteShippingAddress, ShippingAddressFormData } from "@/hooks/use-shipping-addresses";
import { ShippingAddress } from "@/data/types";

// Billing Addresses
import BillingAddressTable from "@/components/BillingAddressTable";
import BillingAddressForm from "@/components/BillingAddressForm";
import { useBillingAddresses, useAddBillingAddress, useUpdateBillingAddress, useDeleteBillingAddress, BillingAddressFormData } from "@/hooks/use-billing-addresses";
import { BillingAddress } from "@/data/types";

const AdminSettings = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage core entities for your application like projects, account managers, and addresses.
      </p>
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="account-managers">Account Managers</TabsTrigger>
          <TabsTrigger value="shipping-addresses">Shipping Addresses</TabsTrigger>
          <TabsTrigger value="billing-addresses">Billing Addresses</TabsTrigger>
        </TabsList>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="account-managers"><AccountManagersTab /></TabsContent>
        <TabsContent value="shipping-addresses"><ShippingAddressesTab /></TabsContent>
        <TabsContent value="billing-addresses"><BillingAddressesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// Projects Tab Component
const ProjectsTab = () => {
  const { data: projects, isLoading, error } = useProjects();
  const addMutation = useAddProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Project | undefined>(undefined);

  const handleSubmit = async (values: ProjectFormValues) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </div>
      <ProjectTable projects={projects || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Project" : "Add New Project"}</DialogTitle></DialogHeader>
          <ProjectForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Account Managers Tab Component
const AccountManagersTab = () => {
  const { data: managers, isLoading, error } = useAccountManagers();
  const addMutation = useAddAccountManager();
  const updateMutation = useUpdateAccountManager();
  const deleteMutation = useDeleteAccountManager();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AccountManager | undefined>(undefined);

  const handleSubmit = async (values: AccountManagerFormValues) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Manager
        </Button>
      </div>
      <AccountManagerTable accountManagers={managers || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Manager" : "Add New Manager"}</DialogTitle></DialogHeader>
          <AccountManagerForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Shipping Addresses Tab Component
const ShippingAddressesTab = () => {
  const { data: addresses, isLoading, error } = useShippingAddresses();
  const addMutation = useAddShippingAddress();
  const updateMutation = useUpdateShippingAddress();
  const deleteMutation = useDeleteShippingAddress();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ShippingAddress | undefined>(undefined);

  const handleSubmit = async (values: ShippingAddressFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>
      <ShippingAddressTable addresses={addresses || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Address" : "Add New Address"}</DialogTitle></DialogHeader>
          <ShippingAddressForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Billing Addresses Tab Component
const BillingAddressesTab = () => {
  const { data: addresses, isLoading, error } = useBillingAddresses();
  const addMutation = useAddBillingAddress();
  const updateMutation = useUpdateBillingAddress();
  const deleteMutation = useDeleteBillingAddress();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BillingAddress | undefined>(undefined);

  const handleSubmit = async (values: BillingAddressFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>
      <BillingAddressTable addresses={addresses || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Address" : "Add New Address"}</DialogTitle></DialogHeader>
          <BillingAddressForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;