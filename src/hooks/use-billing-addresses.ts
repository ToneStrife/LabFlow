import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGetBillingAddresses, apiAddBillingAddress, apiUpdateBillingAddress, apiDeleteBillingAddress } from "@/integrations/api";
import { BillingAddress } from "@/data/types";

// --- Fetch Hook ---
export const useBillingAddresses = () => {
  return useQuery<BillingAddress[], Error>({
    queryKey: ["billingAddresses"],
    queryFn: apiGetBillingAddresses,
  });
};

// --- Mutation Hooks ---
export interface BillingAddressFormData {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export const useAddBillingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<BillingAddress, Error, BillingAddressFormData>({
    mutationFn: apiAddBillingAddress,
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ["billingAddresses"] });
      toast.success("Billing Address added successfully!", {
        description: newAddress.name,
      });
    },
    onError: (error) => {
      toast.error("Failed to add Billing Address.", {
        description: error.message,
      });
    },
  });
};

export const useUpdateBillingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<BillingAddress, Error, { id: string; data: BillingAddressFormData }>({
    mutationFn: ({ id, data }) => apiUpdateBillingAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingAddresses"] });
      toast.success("Billing Address updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update Billing Address.", {
        description: error.message,
      });
    },
  });
};

export const useDeleteBillingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: apiDeleteBillingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billingAddresses"] });
      toast.success("Billing Address deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete Billing Address.", {
        description: error.message,
      });
    },
  });
};