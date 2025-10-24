"use client";

import React from "react";
import UserAccountTable from "@/components/UserAccountTable"; // Import the renamed component
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, ShieldOff } from "lucide-react"; // Import ShieldOff icon
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import UserAccountForm, { CustomerAccountFormValues } from "@/components/UserAccountForm"; // Import the renamed component
import { useCustomerAccounts, useAddCustomerAccount, useUpdateCustomerAccount, useDeleteCustomerAccount, CustomerAccount } from "@/hooks/use-customer-accounts";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom"; // Import useNavigate

const Users = () => {
  const { session, profile, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const { data: customerAccounts, isLoading, error } = useCustomerAccounts();
  const addCustomerAccountMutation = useAddCustomerAccount();
  const updateCustomerAccountMutation = useUpdateCustomerAccount();
  const deleteCustomerAccountMutation = useDeleteCustomerAccount();

  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = React.useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<CustomerAccount | undefined>(undefined);

  // Redirect if not an Admin
  if (sessionLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading User Permissions...
      </div>
    );
  }

  if (!profile || profile.role !== "Admin") {
    toast.error("Unauthorized access.", { description: "You do not have permission to view this page." });
    navigate("/dashboard"); // Redirect to dashboard or another appropriate page
    return null; // Render nothing while redirecting
  }

  const handleAddAccount = async (newAccountData: CustomerAccountFormValues) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to add an account.");
      return;
    }
    const submissionData = {
      ...newAccountData,
      assignedManagerId: newAccountData.assignedManagerId === 'unassigned' ? null : newAccountData.assignedManagerId,
    };
    await addCustomerAccountMutation.mutateAsync({ data: submissionData, ownerId: session.user.id });
    setIsAddAccountDialogOpen(false);
  };

  const handleEditAccount = async (accountId: string, updatedData: CustomerAccountFormValues) => {
    const submissionData = {
      ...updatedData,
      assignedManagerId: updatedData.assignedManagerId === 'unassigned' ? null : updatedData.assignedManagerId,
    };
    await updateCustomerAccountMutation.mutateAsync({ id: accountId, data: submissionData });
    setIsEditAccountDialogOpen(false);
    setEditingAccount(undefined);
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteCustomerAccountMutation.mutateAsync(accountId);
  };

  const openEditDialog = (account: CustomerAccount) => {
    setEditingAccount(account);
    setIsEditAccountDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading User Accounts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading user accounts: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Accounts</h1> {/* Changed title */}
        <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New User Account {/* Changed button text */}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User Account</DialogTitle> {/* Changed dialog title */}
            </DialogHeader>
            <UserAccountForm // Renamed component
              onSubmit={handleAddAccount}
              onCancel={() => setIsAddAccountDialogOpen(false)}
              isSubmitting={addCustomerAccountMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Manage external user accounts (e.g., departments, research groups). These are not application users.
      </p>
      <UserAccountTable // Renamed component
        accounts={customerAccounts || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteAccount}
      />

      {/* Edit User Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User Account</DialogTitle> {/* Changed dialog title */}
          </DialogHeader>
          {editingAccount && (
            <UserAccountForm // Renamed component
              initialData={{
                name: editingAccount.name,
                contactPerson: editingAccount.contact_person || undefined,
                email: editingAccount.email || undefined,
                phone: editingAccount.phone || undefined,
                notes: editingAccount.notes || undefined,
                assignedManagerId: editingAccount.assigned_manager_id || "unassigned",
              }}
              onSubmit={(data) => handleEditAccount(editingAccount.id, data)}
              onCancel={() => setIsEditAccountDialogOpen(false)}
              isSubmitting={updateCustomerAccountMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;