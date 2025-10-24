"use client";

import React from "react";
import CustomerAccountTable from "@/components/CustomerAccountTable";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CustomerAccountForm, { CustomerAccountFormValues } from "@/components/CustomerAccountForm";
import { useCustomerAccounts, useAddCustomerAccount, useUpdateCustomerAccount, useDeleteCustomerAccount, CustomerAccount } from "@/hooks/use-customer-accounts";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";

const Accounts = () => {
  const { session } = useSession();
  const { data: customerAccounts, isLoading, error } = useCustomerAccounts();
  const addCustomerAccountMutation = useAddCustomerAccount();
  const updateCustomerAccountMutation = useUpdateCustomerAccount();
  const deleteCustomerAccountMutation = useDeleteCustomerAccount();

  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = React.useState(false);
  const [isEditAccountDialogOpen, setIsEditAccountDialogOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<CustomerAccount | undefined>(undefined);

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
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Accounts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading accounts: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customer Accounts</h1>
        <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Customer Account</DialogTitle>
            </DialogHeader>
            <CustomerAccountForm
              onSubmit={handleAddAccount}
              onCancel={() => setIsAddAccountDialogOpen(false)}
              isSubmitting={addCustomerAccountMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Manage your customer accounts and assign account managers.
      </p>
      <CustomerAccountTable
        accounts={customerAccounts || []}
        onEdit={openEditDialog}
        onDelete={handleDeleteAccount}
      />

      {/* Edit Account Dialog */}
      <Dialog open={isEditAccountDialogOpen} onOpenChange={setIsEditAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Customer Account</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <CustomerAccountForm
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

export default Accounts;