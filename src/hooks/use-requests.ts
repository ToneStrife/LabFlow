import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as MockSupabaseRequest, SupabaseRequestItem as MockSupabaseRequestItem, RequestItem, RequestStatus } from "@/data/types";
import { toast } from "sonner";
import { 
  apiGetRequests, 
  apiAddRequest, 
  apiDeleteRequest, 
  apiAddInventoryItem, 
  apiSendEmail, 
  apiUpdateRequestFile,
  apiUpdateRequest
} from "@/integrations/api";

export interface SupabaseRequestItem extends MockSupabaseRequestItem {}
export interface SupabaseRequest extends MockSupabaseRequest {}

// --- Fetch Hook ---
export const useRequests = () => {
  return useQuery<SupabaseRequest[], Error>({
    queryKey: ["requests"],
    queryFn: apiGetRequests,
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
      return apiAddRequest({
        vendorId: data.vendorId,
        accountManagerId: data.accountManagerId,
        notes: data.notes,
        projectCodes: data.projectCodes,
        items: data.items,
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

// Generic Update Request
export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, { id: string; data: Partial<SupabaseRequest> }>({
    mutationFn: async ({ id, data }) => {
      const updatedRequest = await apiUpdateRequest(id, data);

      // If status is changing to "Ordered", add items to inventory
      if (data.status === "Ordered" && updatedRequest.items) {
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
        toast.info("Items from request have been added to inventory.");
      }
      return updatedRequest;
    },
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Request ${updatedRequest.id} updated successfully!`);
    },
    onError: (error) => {
      toast.error("Failed to update request.", {
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
  file: File;
  poNumber?: string | null;
}

export const useUpdateRequestFile = () => {
  const queryClient = useQueryClient();
  return useMutation<{ fileUrl: string; poNumber: string | null }, Error, UpdateRequestFileData>({
    mutationFn: async ({ id, fileType, file, poNumber }) => {
      return apiUpdateRequestFile(id, fileType, file, poNumber);
    },
    onSuccess: (_, variables) => {
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
    mutationFn: apiDeleteRequest,
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

// Hook for sending emails
interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; url: string }[];
}

export const useSendEmail = () => {
  return useMutation<void, Error, SendEmailData>({
    mutationFn: apiSendEmail,
    onSuccess: () => {
      toast.success("Email sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send email.", {
        description: error.message,
      });
    },
  });
};