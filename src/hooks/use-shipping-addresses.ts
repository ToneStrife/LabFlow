import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGetShippingAddresses, apiAddShippingAddress, apiUpdateShippingAddress, apiDeleteShippingAddress } from "@/integrations/api";
import { ShippingAddress } from "@/data/types";

// --- Fetch Hook ---
export const useShippingAddresses = () => {
  return useQuery<ShippingAddress[], Error>({
    queryKey: ["shippingAddresses"],
    queryFn: apiGetShippingAddresses,
  });
};

// --- Mutation Hooks ---
export interface ShippingAddressFormData {
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
}

export const useAddShippingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<ShippingAddress, Error, ShippingAddressFormData>({
    mutationFn: apiAddShippingAddress,
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ["shippingAddresses"] });
      toast.success("Shipping Address added successfully!", {
        description: newAddress.name,
      });
    },
    onError: (error) => {
      toast.error("Failed to add Shipping Address.", {
        description: error.message,
      });
    },
  });
};

export const useUpdateShippingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<ShippingAddress, Error, { id: string; data: ShippingAddressFormData }>({
    mutationFn: ({ id, data }) => apiUpdateShippingAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shippingAddresses"] });
      toast.success("Shipping Address updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update Shipping Address.", {
        description: error.message,
      });
    },
  });
};

export const useDeleteShippingAddress = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: apiDeleteShippingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shippingAddresses"] });
      toast.success("Shipping Address deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete Shipping Address.", {
        description: error.message,
      });
    },
  });
};