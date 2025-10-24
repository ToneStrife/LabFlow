import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AccountManager } from "@/data/types";
import { toast } from "sonner";
import { apiGetAccountManagers, apiAddAccountManager, apiUpdateAccountManager, apiDeleteAccountManager } from "@/integrations/api";

// --- Fetch Hook ---
const fetchAccountManagers = async (): Promise<AccountManager[]> => {
  return apiGetAccountManagers();
};

export const useAccountManagers = () => {
  return useQuery<AccountManager[], Error>({
    queryKey: ["accountManagers"],
    queryFn: fetchAccountManagers,
  });
};

// --- Mutation Hooks ---

interface AccountManagerFormData {
  first_name: string;
  last_name: string;
  email: string;
}

// Add Account Manager
export const useAddAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountManager, Error, AccountManagerFormData>({
    mutationFn: async (data) => {
      return apiAddAccountManager(data);
    },
    onSuccess: (newManager) => {
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Account Manager added successfully!", {
        description: `${newManager.first_name} ${newManager.last_name}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add Account Manager.", {
        description: error.message,
      });
    },
  });
};

// Update Account Manager
export const useUpdateAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountManager, Error, { id: string; data: Partial<AccountManagerFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateAccountManager(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Account Manager updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update Account Manager.", {
        description: error.message,
      });
    },
  });
};

// Delete Account Manager
export const useDeleteAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteAccountManager(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Account Manager deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete Account Manager.", {
        description: error.message,
      });
    },
  });
};