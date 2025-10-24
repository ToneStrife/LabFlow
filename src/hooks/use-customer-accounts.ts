import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CustomerAccount as MockCustomerAccount } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetCustomerAccounts, apiAddCustomerAccount, apiUpdateCustomerAccount, apiDeleteCustomerAccount } from "@/integrations/api"; // Importar desde la nueva API simulada

export interface CustomerAccount extends MockCustomerAccount {}

// --- Fetch Hook ---
const fetchCustomerAccounts = async (): Promise<CustomerAccount[]> => {
  return apiGetCustomerAccounts(); // Usar la función de la API simulada
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
      return apiAddCustomerAccount({ // Usar la función de la API simulada
        name: data.name,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        owner_id: ownerId,
        assigned_manager_id: data.assignedManagerId || null,
      });
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
      return apiUpdateCustomerAccount(id, { // Usar la función de la API simulada
        name: data.name,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        assigned_manager_id: data.assignedManagerId || null,
      });
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
      return apiDeleteCustomerAccount(id); // Usar la función de la API simulada
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