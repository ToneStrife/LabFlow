import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as SupabaseRequestType, SupabaseRequestItem as SupabaseRequestItemType, RequestItem, RequestStatus } from "@/data/types";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest, apiAddInventoryItem, apiSendEmail, apiUpdateRequestFile, apiUpdateRequestMetadata, apiUpdateFullRequest, apiRevertRequestReception } from "@/integrations/api";

export interface SupabaseRequestItem extends SupabaseRequestItemType {}
export interface SupabaseRequest extends SupabaseRequestType {}

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
      toast.success("Solicitud enviada exitosamente!", {
        description: `ID de Solicitud: ${newRequest.id}`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al enviar la solicitud.", {
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
      toast.success(`Estado de la Solicitud ${updatedRequest.id} actualizado a ${updatedRequest.status}!`);
    },
    onError: (error) => {
      toast.error("Fallo al actualizar el estado de la solicitud.", {
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
      toast.success(`Detalles de la solicitud actualizados exitosamente!`);
    },
    onError: (error) => {
      toast.error("Fallo al actualizar los detalles de la solicitud.", {
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
      toast.success(`Metadatos de la solicitud actualizados exitosamente!`);
    },
    onError: (error) => {
      toast.error("Fallo al actualizar los metadatos de la solicitud.", {
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

// REFACTOR: This mutation now ONLY handles the file upload and returns the file path.
export const useUpdateRequestFile = () => {
  const queryClient = useQueryClient();
  return useMutation<{ filePath: string | null; poNumber: string | null }, Error, UpdateRequestFileData>({
    mutationFn: async ({ id, fileType, file, poNumber }) => {
      return apiUpdateRequestFile(id, fileType, file, poNumber);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      
      let message = `${variables.fileType.toUpperCase()} detalles guardados exitosamente!`;
      if (data.filePath) {
        message = `${variables.fileType.toUpperCase()} archivo subido exitosamente!`;
      } else if (variables.fileType === 'po' && data.poNumber) {
        message = `Número de PO ${data.poNumber} guardado exitosamente!`;
      }

      toast.success(message);
    },
    onError: (error, variables) => {
      toast.error(`Fallo al guardar los detalles de ${variables.fileType.toUpperCase()}.`, {
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
      toast.success("Solicitud eliminada exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al eliminar la solicitud.", {
        description: error.message,
      });
    },
  });
};

// Revert Request Reception (New Hook)
export const useRevertRequestReception = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (requestId) => {
      await apiRevertRequestReception(requestId);
    },
    onSuccess: (data, requestId) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["packingSlips", requestId] });
      queryClient.invalidateQueries({ queryKey: ["aggregatedReceivedItems", requestId] });
      toast.success("Reversión de recepción exitosa!", {
        description: "Artículos eliminados del inventario y estado establecido a Pedido.",
      });
    },
    onError: (error) => {
      toast.error("Fallo al revertir la recepción.", {
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
  fromName?: string;
  // La URL aquí debe ser la RUTA DE ALMACENAMIENTO (storage path) para que la función Edge pueda descargarla.
  attachments?: { name: string; url: string }[]; 
}

export const useSendEmail = () => {
  return useMutation<void, Error, SendEmailData>({
    mutationFn: async (emailData) => {
      await apiSendEmail(emailData);
    },
    onSuccess: () => {
      toast.success("Correo enviado exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al enviar correo.", {
        description: error.message,
      });
    },
  });
};