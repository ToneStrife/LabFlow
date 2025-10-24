"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserTable from "@/components/UserTable";
import InviteUserDialog, { InviteUserFormValues } from "@/components/InviteUserDialog"; // Importar el nuevo diálogo de invitación
import { useAllProfiles, useInviteUser, useUpdateProfile, useDeleteProfile, Profile } from "@/hooks/use-profiles";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";

const Users: React.FC = () => {
  const { profile: currentUserProfile, loading: sessionLoading } = useSession();
  const { data: allProfiles, isLoading, error } = useAllProfiles();
  const inviteUserMutation = useInviteUser();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();

  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = React.useState(false);

  const handleInviteUser = async (data: InviteUserFormValues) => {
    await inviteUserMutation.mutateAsync(data);
    setIsInviteUserDialogOpen(false);
  };

  const handleUpdateUserRole = async (userId: string, newRole: Profile['role']) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot change your own role.", { description: "Please ask another administrator to change your role." });
      return;
    }
    await updateProfileMutation.mutateAsync({ id: userId, data: { role: newRole } });
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot delete your own account.", { description: "Please ask another administrator to delete your account." });
      return;
    }
    await deleteProfileMutation.mutateAsync(userId);
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Users...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading users: {error.message}
      </div>
    );
  }

  // Solo los administradores pueden ver y gestionar usuarios
  if (currentUserProfile?.role !== "Admin") {
    return (
      <div className="container mx-auto py-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
        <p className="text-lg text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Invite New User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <InviteUserDialog
              onSubmit={handleInviteUser}
              onCancel={() => setIsInviteUserDialogOpen(false)}
              isSubmitting={inviteUserMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Manage all registered users, update their roles, or invite new members to the platform.
      </p>
      <UserTable
        users={allProfiles || []}
        onRoleChange={handleUpdateUserRole}
        onDelete={handleDeleteUser}
        currentUserId={currentUserProfile?.id}
        isUpdatingRole={updateProfileMutation.isPending}
        isDeletingUser={deleteProfileMutation.isPending}
      />
    </div>
  );
};

export default Users;