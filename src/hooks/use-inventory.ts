import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryItem as MockInventoryItem } from "@/data/types";
import { toast } from "sonner";
import { apiGetInventory, apiAddInventoryItem, apiUpdateInventoryItem, apiDeleteInventoryItem } from "@/integrations/api";

export interface InventoryItem extends MockInventoryItem {}

// --- Fetch Hook ---
export const useInventory = () => {
  return useQuery<InventoryItem[], Error>({
    queryKey: ["inventory"],
    queryFn: apiGetInventory,
  });
};

// --- Mutation Hooks ---

interface InventoryItemFormData {
  product_name: string;
  catalog_number: string;
  brand?: string | null;
  quantity: number;
  unit_price?: number | null;
  format?: string | null;
}

// Add/Update Inventory Item (uses RPC)
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<InventoryItem, Error, InventoryItemFormData>({
    mutationFn: apiAddInventoryItem,
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory updated!", {
        description: `Added/Updated: ${newItem.product_name} (Qty: ${newItem.quantity})`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add/update inventory item.", {
        description: error.message,
      });
    },
  });
};

// Update Inventory Item (direct update)
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<InventoryItem, Error, { id: string; data: Partial<InventoryItemFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateInventoryItem(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory item updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update inventory item.", {
        description: error.message,
      });
    },
  });
};

// Delete Inventory Item
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: apiDeleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventory item deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete inventory item.", {
        description: error.message,
      });
    },
  });
};