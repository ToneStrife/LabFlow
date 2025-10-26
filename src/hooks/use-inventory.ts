import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryItem as MockInventoryItem } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetInventory, apiAddInventoryItem, apiUpdateInventoryItem, apiDeleteInventoryItem } from "@/integrations/api";

export interface InventoryItem extends MockInventoryItem {}

// --- Fetch Hook ---
const fetchInventory = async (): Promise<InventoryItem[]> => {
  return apiGetInventory();
};

export const useInventory = () => {
  return useQuery<InventoryItem[], Error>({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
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

// Add Inventory Item
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<InventoryItem, Error, InventoryItemFormData>({
    mutationFn: async (data) => {
      return apiAddInventoryItem(data);
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Inventario actualizado!", {
        description: `Añadido/Actualizado: ${newItem.product_name} (Cant: ${newItem.quantity})`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al añadir/actualizar el artículo de inventario.", {
        description: error.message,
      });
    },
  });
};

// Update Inventory Item
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<InventoryItem, Error, { id: string; data: Partial<InventoryItemFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateInventoryItem(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Artículo de inventario actualizado exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al actualizar el artículo de inventario.", {
        description: error.message,
      });
    },
  });
};

// Delete Inventory Item
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteInventoryItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Artículo de inventario eliminado exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al eliminar el artículo de inventario.", {
        description: error.message,
      });
    },
  });
};