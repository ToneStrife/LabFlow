import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as MockSupabaseRequest, SupabaseRequestItem as MockSupabaseRequestItem, RequestItem, RequestStatus } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest, apiAddInventoryItem, apiSendEmail, apiUpdateRequestFile } from "@/integrations/api"; // Importar apiSendEmail y apiUpdateRequestFile

export interface SupabaseRequestItem extends MockSupabaseRequestItem {}
export interface SupabaseRequest extends MockSupabaseRequest {}

// --- Fetch Hook ---
const fetchRequests = async (): Promise<SupabaseRequest[]> => {
  return apiGetRequests();
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

      return apiAddRequest({
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
interface UpdateRequestStatusData {
  id: string;
  status: RequestStatus;
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestStatusData>({
    mutationFn: async ({ id, status }) => {
      const updatedRequest = await apiUpdateRequestStatus(id, status);

      // If status changes to "Ordered", add items to inventory
      if (status === "Ordered" && updatedRequest.items) {
        for (const item of updatedRequest.items) {
          await apiAddInventoryItem({
            product_name: item.product_name,
            catalog_number: item.catalog_number,
            brand: item.brand,
            quantity: item.quantity,
            unit_price: item.unit_price,
            format: item.format,
          });
        }
        toast.success("Items added to inventory!");
      }
      return updatedRequest;
    },
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Invalidate inventory cache
      toast.success(`Request ${updatedRequest.id} status updated to ${updatedRequest.status}!`);
    },
    onError: (error) => {
      toast.error("Failed to update request status.", {
        description: error.message,
      });
    },
  });
};

// Update Request File
export type FileType = "quote" | "po" | "slip";
interface UpdateRequestFileData {
  id: string;
  fileType: FileType;
  fileUrl: string;
  poNumber?: string | null;
}

export const useUpdateRequestFile = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestFileData>({
    mutationFn: async ({ id, fileType, fileUrl, poNumber }) => {
      return apiUpdateRequestFile(id, fileType, fileUrl, poNumber);
    },
    onSuccess: (updatedRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success(`${variables.fileType.toUpperCase()} file uploaded successfully!`);
    },
    onError: (error, variables) => {
      toast.error(`Failed to upload ${variables.fileType.toUpperCase()} file.`, {
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
      return apiDeleteRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete request.",
        { description: error.message,
      });
    },
  });
};

// Hook for sending emails
interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const useSendEmail = () => {
  return useMutation<void, Error, SendEmailData>({
    mutationFn: async (emailData) => {
      await apiSendEmail(emailData);
    },
    onSuccess: () => {
      toast.success("Simulated email sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send simulated email.", {
        description: error.message,
      });
    },
  });
};