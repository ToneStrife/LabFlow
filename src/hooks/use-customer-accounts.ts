import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomerAccount {
  id: string;
  created_at: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  owner_id: string;
  assigned_manager_id: string | null;
}

// --- Fetch Hook ---
const fetchCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  const { data, error } = await supabase
    .from("customer_accounts")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data as CustomerAccount[];
};

export const useCustomerAccounts = () => {
  return useQuery<CustomerAccount[], Error>({
    queryKey: ["customerAccounts"],
    queryFn: fetchCustomerAccounts,
  });
};

// --- Mutation Hooks ---

interface CustomerAccountFormData {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  assignedManagerId?: string | null;
}

// Add Customer Account
export const useAddCustomerAccount = () => {
  const queryClient = useQueryClient();
  return useMutation<CustomerAccount, Error, { data: CustomerAccountFormData; ownerId: string }>({
    mutationFn: async ({ data, ownerId }) => {
      const { data: newAccount, error } = await supabase
        .from("customer_accounts")
        .insert({
          name: data.name,
          contact_person: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          owner_id: ownerId,
          assigned_manager_id: data.assignedManagerId || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return newAccount as CustomerAccount;
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: ["customerAccounts"] });
      toast.success("Account added successfully!", {
        description: `Account: ${newAccount.name}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add account.", {
        description: error.message,
      });
    },
  });
};

// Update Customer Account
export const useUpdateCustomerAccount = () => {
  const queryClient = useQueryClient();
  return useMutation<CustomerAccount, Error, { id: string; data: CustomerAccountFormData }>({
    mutationFn: async ({ id, data }) => {
      const { data: updatedAccount, error } = await supabase
        .from("customer_accounts")
        .update({
          name: data.name,
          contact_person: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          assigned_manager_id: data.assignedManagerId || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return updatedAccount as CustomerAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAccounts"] });
      toast.success("Account updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update account.", {
        description: error.message,
      });
    },
  });
};

// Delete Customer Account
export const useDeleteCustomerAccount = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("customer_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAccounts"] });
      toast.success("Account deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete account.", {
        description: error.message,
      });
    },
  });
};