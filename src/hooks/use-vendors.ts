import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Vendor as MockVendor } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetVendors, apiAddVendor, apiUpdateVendor, apiDeleteVendor } from "@/integrations/api"; // Importar desde la nueva API simulada

export interface Vendor extends MockVendor {}

// --- Fetch Hook ---
const fetchVendors = async (): Promise<Vendor[]> => {
  return apiGetVendors(); // Usar la función de la API simulada
};

export const useVendors = () => {
  return useQuery<Vendor[], Error>({
    queryKey: ["vendors"],
    queryFn: fetchVendors,
  });
};

// --- Mutation Hooks ---

interface VendorFormData {
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  brands?: string[] | null;
}

// Add Vendor
export const useAddVendor = () => {
  const queryClient = useQueryClient();
  return useMutation<Vendor, Error, VendorFormData>({
    mutationFn: async (data) => {
      return apiAddVendor({ // Usar la función de la API simulada
        name: data.name,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        brands: data.brands || null,
      });
    },
    onSuccess: (newVendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor added successfully!", {
        description: `Vendor: ${newVendor.name}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add vendor.", {
        description: error.message,
      });
    },
  });
};

// Update Vendor
export const useUpdateVendor = () => {
  const queryClient = useQueryClient();
  return useMutation<Vendor, Error, { id: string; data: VendorFormData }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateVendor(id, { // Usar la función de la API simulada
        name: data.name,
        contact_person: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        notes: data.notes || null,
        brands: data.brands || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update vendor.", {
        description: error.message,
      });
    },
  });
};

// Delete Vendor
export const useDeleteVendor = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteVendor(id); // Usar la función de la API simulada
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete vendor.", {
        description: error.message,
      });
    },
  });
};