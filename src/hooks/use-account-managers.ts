import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGetAccountManagers, apiAddAccountManager, apiUpdateAccountManager, apiDeleteAccountManager } from "@/integrations/api";
import { AccountManager } from "@/data/types";

// --- Fetch Hook ---
export const useAccountManagers = () => {
  return useQuery<AccountManager[], Error>({
    queryKey: ["accountManagers"],
    queryFn: apiGetAccountManagers,
  });
};

// --- Mutation Hooks ---
interface AccountManagerFormData {
  name: string;
  email?: string;
}

export const useAddAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountManager, Error, AccountManagerFormData>({
    mutationFn: apiAddAccountManager,
    onSuccess: (newManager) => {
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Account Manager added successfully!", {
        description: newManager.name,
      });
    },
    onError: (error) => {
      toast.error("Failed to add Account Manager.", {
        description: error.message,
      });
    },
  });
};

export const useUpdateAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<AccountManager, Error, { id: string; data: AccountManagerFormData }>({
    mutationFn: ({ id, data }) => apiUpdateAccountManager(id, data),
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

export const useDeleteAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: apiDeleteAccountManager,
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