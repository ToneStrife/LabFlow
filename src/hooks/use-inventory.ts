import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { InventoryItem as InventoryItemType } from "@/data/types"; 
import { toast } from "sonner";
import { apiGetInventory, apiAddInventoryItem, apiUpdateInventoryItem, apiDeleteInventoryItem } from "@/integrations/api";

export interface InventoryItem extends InventoryItemType {}

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

// Definir la forma de los datos que vienen del formulario (todos los campos de la tabla excepto IDs/timestamps)
export interface InventoryItemFormData {
  product_name: string;
  catalog_number: string;
  brand: string | null | undefined; // Nullable in DB, optional in form
  quantity: number;
  unit_price: number | null | undefined; // Nullable in DB, optional in form
  format: string | null | undefined; // Nullable in DB, optional in form
}

// Add Inventory Item
export const useAddInventoryItem = () => {
  const queryClient = useQueryClient();
  return useMutation<InventoryItem, Error, InventoryItemFormData>({
    mutationFn: async (data) => {
      // Asegurar que los campos opcionales/nullable se mapeen a null si son undefined
      const dataToSubmit = {
        product_name: data.product_name,
        catalog_number: data.catalog_number,
        brand: data.brand || null,
        quantity: data.quantity,
        unit_price: data.unit_price || null,
        format: data.format || null,
      };
      return apiAddInventoryItem(dataToSubmit);
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
      // Mapear los campos opcionales a null si se envían como cadena vacía o undefined
      const dataToSubmit: Partial<InventoryItemFormData> = {};
      for (const key in data) {
        const value = data[key as keyof Partial<InventoryItemFormData>];
        if (value === "") {
          (dataToSubmit as any)[key] = null;
        } else if (value !== undefined) {
          (dataToSubmit as any)[key] = value;
        }
      }
      return apiUpdateInventoryItem(id, dataToSubmit);
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