import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RequestItem, RequestStatus } from "@/data/mockData"; // Reusing types from mockData

// Define Supabase Request types
export interface SupabaseRequestItem {
  id: string;
  request_id: string;
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
  // Joined items will be added manually in fetch logic
  items?: SupabaseRequestItem[];
}

// --- Fetch Hook ---

// Fetches all requests and their associated items
const fetchRequests = async (): Promise<SupabaseRequest[]> => {
  // Fetch requests first
  const { data: requestsData, error: requestsError } = await supabase
    .from("requests")
    .select(`
      *,
      items:request_items (*)
    `)
    .order("created_at", { ascending: false });

  if (requestsError) {
    throw new Error(requestsError.message);
  }
  
  // Map the data to ensure 'items' is correctly nested and typed
  const requests: SupabaseRequest[] = requestsData.map(req => ({
    ...req,
    items: req.items || [],
    // Rename snake_case fields to camelCase for consistency if needed, 
    // but sticking to DB names for now for simplicity in the hook.
  }));

  return requests;
};

export const useRequests = () => {
  return useQuery<SupabaseRequest[], Error>({
    queryKey: ["requests"],
    queryFn: fetchRequests,
  });
};

// --- Mutation Hooks ---

interface NewRequestData {
  vendorId: string;
  requesterId: string;
  accountManagerId: string;
  notes?: string;
  projectCodes?: string[];
  items: RequestItem[];
}

// Add Request
export const useAddRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, NewRequestData>({
    mutationFn: async (data) => {
      // 1. Insert Request Header
      const { data: requestHeader, error: requestError } = await supabase
        .from("requests")
        .insert({
          vendor_id: data.vendorId,
          requester_id: data.requesterId,
          account_manager_id: data.accountManagerId,
          notes: data.notes || null,
          project_codes: data.projectCodes || null,
          status: "Pending",
        })
        .select()
        .single();

      if (requestError) {
        throw new Error(`Failed to create request header: ${requestError.message}`);
      }

      const newRequestId = requestHeader.id;

      // 2. Prepare and Insert Request Items
      const itemsToInsert = data.items.map(item => ({
        request_id: newRequestId,
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
        // Ideally, we would roll back the request header here, but Supabase doesn't support transactions easily.
        // For now, we log the error and proceed, but the request will be incomplete.
        console.error("Failed to insert request items:", itemsError);
        throw new Error(`Request created, but failed to insert items: ${itemsError.message}`);
      }

      return { ...requestHeader, items: data.items } as SupabaseRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request submitted successfully!");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request status updated!");
    },
    onError: (error) => {
      toast.error("Failed to update request status.", {
        description: error.message,
      });
    },
  });
};