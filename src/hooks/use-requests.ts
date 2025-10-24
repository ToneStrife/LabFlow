import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as MockSupabaseRequest, SupabaseRequestItem as MockSupabaseRequestItem, RequestItem, RequestStatus } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest } from "@/integrations/api"; // Importar desde la nueva API simulada

export interface SupabaseRequestItem extends MockSupabaseRequestItem {}
export interface SupabaseRequest extends MockSupabaseRequest {}

// --- Fetch Hook ---
const fetchRequests = async (): Promise<SupabaseRequest[]> => {
  return apiGetRequests(); // Usar la función de la API simulada
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
  items: RequestItem[];
}

// Add Request
export const useAddRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, AddRequestFormData>({
    mutationFn: async (data) => {
      const { vendorId, requesterId, accountManagerId, notes, projectCodes, items } = data;

      return apiAddRequest({ // Usar la función de la API simulada
        vendor_id: vendorId,
        requester_id: requesterId,
        account_manager_id: accountManagerId,
        notes: notes || null,
        project_codes: projectCodes || null,
        items: items,
      });
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
      return apiUpdateRequestStatus(id, status); // Usar la función de la API simulada
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

// Delete Request
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteRequest(id); // Usar la función de la API simulada
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