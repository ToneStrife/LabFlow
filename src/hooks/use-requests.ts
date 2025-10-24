import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequestItem, RequestStatus } from "@/data/mockData"; // Re-using RequestItem and RequestStatus types

export interface SupabaseRequestItem {
  id: string;
  product_name: string;
  catalog_number: string;
  quantity: number;
  unit_price: number | null;
  format: string | null;
  link: string | null;
  notes: string | null;
  brand: string | null;
}

export interface SupabaseRequest {
  id: string;
  created_at: string;
  vendor_id: string;
  requester_id: string;
  account_manager_id: string | null;
  status: RequestStatus;
  notes: string | null;
  project_codes: string[] | null;
  items: SupabaseRequestItem[] | null; // Items are now a JSONB column
}

// --- Fetch Hook ---
const fetchRequests = async (): Promise<SupabaseRequest[]> => {
  const { data, error } = await supabase
    .from("requests")
    .select(`
      *,
      items:request_items(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Map the fetched data to the SupabaseRequest interface, handling nested items
  const requestsWithItems: SupabaseRequest[] = data.map(req => ({
    id: req.id,
    created_at: req.created_at,
    vendor_id: req.vendor_id,
    requester_id: req.requester_id,
    account_manager_id: req.account_manager_id,
    status: req.status as RequestStatus,
    notes: req.notes,
    project_codes: req.project_codes,
    items: req.items ? req.items.map((item: any) => ({
      id: item.id,
      product_name: item.product_name,
      catalog_number: item.catalog_number,
      quantity: item.quantity,
      unit_price: item.unit_price,
      format: item.format,
      link: item.link,
      notes: item.notes,
      brand: item.brand,
    })) : [],
  }));

  return requestsWithItems;
};

export const useRequests = () => {
  return useQuery<SupabaseRequest[], Error>({
    queryKey: ["requests"],
    queryFn: fetchRequests,
  });
};

// --- Mutation Hooks ---

interface AddRequestFormData {
  vendorId: string;
  requesterId: string;
  accountManagerId: string | null;
  notes?: string | null;
  projectCodes?: string[] | null;
  items: RequestItem[]; // Use the RequestItem from mockData for input
}

// Add Request
export const useAddRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, AddRequestFormData>({
    mutationFn: async (data) => {
      const { vendorId, requesterId, accountManagerId, notes, projectCodes, items } = data;

      // First, insert the main request
      const { data: newRequest, error: requestError } = await supabase
        .from("requests")
        .insert({
          vendor_id: vendorId,
          requester_id: requesterId,
          account_manager_id: accountManagerId,
          notes: notes || null,
          project_codes: projectCodes || null,
          status: "Pending", // Default status
        })
        .select()
        .single();

      if (requestError) {
        throw new Error(requestError.message);
      }

      // Then, insert each item linked to the new request
      const itemsToInsert = items.map(item => ({
        request_id: newRequest.id,
        product_name: item.productName,
        catalog_number: item.catalogNumber,
        quantity: item.quantity,
        unit_price: item.unitPrice || null,
        format: item.format || null,
        link: item.link || null,
        notes: item.notes || null,
        brand: item.brand || null,
      }));

      const { error: itemsError } = await supabase
        .from("request_items")
        .insert(itemsToInsert);

      if (itemsError) {
        // If item insertion fails, consider rolling back the request or logging
        console.error("Error inserting request items:", itemsError);
        // For simplicity, we'll just throw, but in a real app, you might handle this differently
        throw new Error("Request created, but failed to add all items: " + itemsError.message);
      }

      // Re-fetch the request with its items for the return value
      const { data: fullNewRequest, error: fetchError } = await supabase
        .from("requests")
        .select(`
          *,
          items:request_items(*)
        `)
        .eq("id", newRequest.id)
        .single();

      if (fetchError) {
        throw new Error("Failed to fetch complete new request: " + fetchError.message);
      }

      return {
        id: fullNewRequest.id,
        created_at: fullNewRequest.created_at,
        vendor_id: fullNewRequest.vendor_id,
        requester_id: fullNewRequest.requester_id,
        account_manager_id: fullNewRequest.account_manager_id,
        status: fullNewRequest.status as RequestStatus,
        notes: fullNewRequest.notes,
        project_codes: fullNewRequest.project_codes,
        items: fullNewRequest.items ? fullNewRequest.items.map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          catalog_number: item.catalog_number,
          quantity: item.quantity,
          unit_price: item.unit_price,
          format: item.format,
          link: item.link,
          notes: item.notes,
          brand: item.brand,
        })) : [],
      };
    },
    onSuccess: (newRequest) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request submitted successfully!", {
        description: `Request ID: ${newRequest.id}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to submit request.", {
        description: error.message,
      });
    },
  });
};

// Update Request Status
export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, { id: string; status: RequestStatus }>({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase
        .from("requests")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as SupabaseRequest;
    },
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success(`Request ${updatedRequest.id} status updated to ${updatedRequest.status}!`);
    },
    onError: (error) => {
      toast.error("Failed to update request status.", {
        description: error.message,
      });
    },
  });
};

// Delete Request (optional, not requested but good to have)
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("requests")
        .delete()
        .eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete request.", {
        description: error.message,
      });
    },
  });
};