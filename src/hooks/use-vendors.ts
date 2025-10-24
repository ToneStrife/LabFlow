import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Vendor {
  id: string;
  created_at: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  brands: string[] | null;
}

// --- Fetch Hook ---
const fetchVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data as Vendor[];
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
      const { data: newVendor, error } = await supabase
        .from("vendors")
        .insert({
          name: data.name,
          contact_person: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          brands: data.brands || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return newVendor as Vendor;
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
      const { data: updatedVendor, error } = await supabase
        .from("vendors")
        .update({
          name: data.name,
          contact_person: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          notes: data.notes || null,
          brands: data.brands || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return updatedVendor as Vendor;
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
      const { error } = await supabase
        .from("vendors")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
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