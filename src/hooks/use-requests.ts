import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as MockSupabaseRequest, SupabaseRequestItem as MockSupabaseRequestItem, RequestItem, RequestStatus } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest, apiAddInventoryItem, apiSendEmail, apiUpdateRequestFile, apiUpdateRequestMetadata } from "@/integrations/api"; // Importar apiUpdateRequestMetadata

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
  quoteUrl?: string | null; // Nuevo campo
  poNumber?: string | null; // Nuevo campo
}

export const useUpdateRequestStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestStatusData>({
    mutationFn: async ({ id, status, quoteUrl, poNumber }) => {
      const updatedRequest = await apiUpdateRequestStatus(id, status, quoteUrl, poNumber);

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

// Update Request Metadata
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
    onSuccess: (updatedRequest) => {
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
  file: File; // Cambiado de fileUrl: string a file: File
  poNumber?: string | null;
}

export const useUpdateRequestFile = () => {
  const queryClient = useQueryClient();
  return useMutation<SupabaseRequest, Error, UpdateRequestFileData>({
    mutationFn: async ({ id, fileType, file, poNumber }) => { // Cambiado fileUrl a file
      const { fileUrl: uploadedFileUrl, poNumber: returnedPoNumber } = await apiUpdateRequestFile(id, fileType, file, poNumber);
      
      // Actualizar el estado de la solicitud con la URL del archivo y el número de PO si aplica
      let updatedRequest: SupabaseRequest;
      if (fileType === "quote") {
        updatedRequest = await apiUpdateRequestStatus(id, "PO Requested", uploadedFileUrl);
      } else if (fileType === "po") {
        updatedRequest = await apiUpdateRequestStatus(id, "Ordered", undefined, returnedPoNumber);
      } else {
        // Para 'slip' o cualquier otro tipo, solo actualiza la URL del archivo sin cambiar el estado
        updatedRequest = await apiUpdateRequestMetadata(id, {
          // Aquí necesitaríamos una forma de actualizar solo la URL del archivo en la solicitud
          // Por ahora, simularemos una actualización de metadatos que no cambia el estado
          // En una implementación real, esto podría ser una función API separada o un campo en updateRequestMetadata
        });
        // Para el mock, simplemente actualizamos el objeto request localmente para reflejar la URL
        const currentRequests = queryClient.getQueryData<SupabaseRequest[]>(["requests"]);
        if (currentRequests) {
          const reqIndex = currentRequests.findIndex(r => r.id === id);
          if (reqIndex !== -1) {
            const reqToUpdate = { ...currentRequests[reqIndex] };
            if (fileType === "slip") reqToUpdate.slip_url = uploadedFileUrl;
            // ... otros tipos de archivo si se añaden
            queryClient.setQueryData(["requests"], currentRequests.map(r => r.id === id ? reqToUpdate : r));
            updatedRequest = reqToUpdate;
          } else {
            throw new Error("Request not found in cache after file upload.");
          }
        } else {
          throw new Error("Requests data not found in cache.");
        }
      }
      return updatedRequest;
    },
    onSuccess: (updatedRequest, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Invalidate inventory if status changed to Ordered
      toast.success(`${variables.fileType.toUpperCase()} file uploaded successfully!`);
      
      // Si se subió una cotización, y hay un account manager, enviar el correo de solicitud de PO
      if (variables.fileType === "quote" && updatedRequest.account_manager_id) {
        // Esto se maneja en RequestDetails.tsx ahora, para tener acceso a las plantillas de correo
      }
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