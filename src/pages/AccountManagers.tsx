"use client";

import React from "react";
import AccountManagerTable from "@/components/AccountManagerTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagerProfiles, useUpdateProfile, useDeleteProfile, useInviteUser, Profile } from "@/hooks/use-profiles"; 
import { toast } from "sonner";

const AccountManagers = () => {
  const { data: accountManagers, isLoading, error } = useAccountManagerProfiles();
  const inviteUserMutation = useInviteUser(); // Usar el hook de invitación
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const [isAddManagerDialogOpen, setIsAddManagerDialogOpen] = React.useState(false);
  const [isEditManagerDialogOpen, setIsEditManagerDialogOpen] = React.useState(false);
  const [editingManager, setEditingManager] = React.useState<Profile | undefined>(undefined);

  const handleAddManager = async (newManagerData: AccountManagerFormValues) => {
    await inviteUserMutation.mutateAsync({
      email: newManagerData.email,
      first_name: newManagerData.first_name,
      last_name: newManagerData.last_name,
      role: "Account Manager", // Especificar el rol al invitar
    });
    setIsAddManagerDialogOpen(false);
  };

  const handleEditManager = async (managerId: string, updatedData: AccountManagerFormValues) => {
    await updateProfileMutation.mutateAsync({ id: managerId, data: updatedData });
    setIsEditManagerDialogOpen(false);
    setEditingManager(undefined);
  };

  const handleDeleteManager = async (managerId: string) => {
    await deleteProfileMutation.mutateAsync(managerId);
  };

  const openEditDialog = (manager: Profile) => {
    setEditingManager(manager);
    setIsEditManagerDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Account Managers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading account managers: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Account Managers</h1>
        <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Invite New Manager
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New Account Manager</DialogTitle>
            </DialogHeader>
            <AccountManagerForm
              onSubmit={handleAddManager}
              onCancel={() => setIsAddManagerDialogOpen(false)}
              isSubmitting={inviteUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Gestiona los perfiles de tus gestores de cuentas. Los administradores pueden invitar nuevos gestores de cuentas directamente desde aquí.
      </p>
      <AccountManagerTable
        managers={accountManagers || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteManager}
      />

      {/* Diálogo para editar manager */}
      <Dialog open={isEditManagerDialogOpen} onOpenChange={setIsEditManagerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Account Manager</DialogTitle>
          </DialogHeader>
          {editingManager && (
            <AccountManagerForm
              initialData={editingManager}
              onSubmit={(data) => handleEditManager(editingManager.id, data)}
              onCancel={() => setIsEditManagerDialogOpen(false)}
              isSubmitting={updateProfileMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountManagers;