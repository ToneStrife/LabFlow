import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as MockSupabaseRequest, SupabaseRequestItem as MockSupabaseRequestItem, RequestItem, RequestStatus } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest, apiAddInventoryItem, apiSendEmail, apiUpdateRequestFile, apiUpdateRequestMetadata, apiUpdateFullRequest } from "@/integrations/api";

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
  shippingAddressId: string;
  billingAddressId: string;
  notes?: string | null;
  projectCodes?: string[] | null;
  items: RequestItem[];
}

// Add Request
export const useAddRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, AddRequestFormData>({
    mutationFn: async (data) => {
      const { vendorId, requesterId, accountManagerId, shippingAddressId, billingAddressId, notes, projectCodes, items } = data;

      return apiAddRequest({
        vendorId: vendorId,
        requesterId: requesterId,
        accountManagerId: accountManagerId,
        shippingAddressId: shippingAddressId,
        billingAddressId: billingAddressId,
        notes: notes || null,
        projectCodes: projectCodes || null,
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
  quoteUrl?: string | null;
  poNumber?: string | null;
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestStatusData>({
    mutationFn: async ({ id, status, quoteUrl, poNumber }) => {
      const updatedRequest = await apiUpdateRequestStatus(id, status, quoteUrl, poNumber);

      if (status === "Ordered" && updatedRequest.items) {
        // NOTE: Inventory update logic is now handled inside apiUpdateRequestStatus when status is 'Received'
        // The previous logic here was incorrect as it triggered on 'Ordered'.
        // The correct logic is now implemented in api.ts for 'Received' status.
      }
      return updatedRequest;
    },
    onSuccess: (updatedRequest) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Request ${updatedRequest.id} status updated to ${updatedRequest.status}!`);
    },
    onError: (error) => {
      toast.error("Failed to update request status.", {
        description: error.message,
      });
    },
  });
};

// Update Full Request Details (Vendor, Addresses, Manager, Notes, Projects)
interface UpdateFullRequestData {
  id: string;
  data: {
    vendorId: string;
    shippingAddressId: string;
    billingAddressId: string;
    accountManagerId: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  };
}

export const useUpdateFullRequest = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateFullRequestData>({
    mutationFn: async ({ id, data }) => {
      const managerId = data.accountManagerId === 'unassigned' ? null : data.accountManagerId;
      return apiUpdateFullRequest(id, { ...data, accountManagerId: managerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success(`Request details updated successfully!`);
    },
    onError: (error) => {
      toast.error("Failed to update request details.", {
        description: error.message,
      });
    },
  });
};


// Update Request Metadata (Only Manager, Notes, Projects - kept for consistency if needed later)
interface UpdateRequestMetadataData {
  id: string;
  data: {
    accountManagerId?: string | null;
    notes?: string | null;
    projectCodes?: string[] | null;
  };
}

export const useUpdateRequestMetadata = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestMetadataData>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateRequestMetadata(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success(`Request metadata updated successfully!`);
    },
    onError: (error) => {
      toast.error("Failed to update request metadata.", {
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
  file: File | null; // Aceptar File | null
  poNumber?: string | null;
}

// REFACTOR: This mutation now ONLY handles the file upload and returns the URL.
export const useUpdateRequestFile = () => {
  const queryClient = useQueryClient();
  return useMutation<{ fileUrl: string | null; poNumber: string | null }, Error, UpdateRequestFileData>({
    mutationFn: async ({ id, fileType, file, poNumber }) => {
      return apiUpdateRequestFile(id, fileType, file, poNumber);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      
      let message = `${variables.fileType.toUpperCase()} details saved successfully!`;
      if (data.fileUrl) {
        message = `${variables.fileType.toUpperCase()} file uploaded successfully!`;
      } else if (variables.fileType === 'po' && data.poNumber) {
        message = `PO Number ${data.poNumber} saved successfully!`;
      }

      toast.success(message);
    },
    onError: (error, variables) => {
      toast.error(`Failed to save ${variables.fileType.toUpperCase()} details.`, {
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
    mutationFn: async (emailData) => {
      await apiSendEmail(emailData);
    },
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