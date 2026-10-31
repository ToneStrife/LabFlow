import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupabaseRequest as SupabaseRequestType, SupabaseRequestItem as SupabaseRequestItemType, RequestItem, RequestStatus } from "@/data/types";
import { toast } from "sonner";
import { apiGetRequests, apiAddRequest, apiUpdateRequestStatus, apiDeleteRequest, apiAddInventoryItem, apiSendEmail, apiUpdateRequestFile, apiUpdateRequestMetadata, apiUpdateFullRequest, apiRevertRequestReception } from "@/integrations/api";
import { invalidateRequestEvents } from "@/lib/activity";
import { getRequestStatusLabel } from "@/lib/request-status";

export interface SupabaseRequestItem extends SupabaseRequestItemType {}
export interface SupabaseRequest extends SupabaseRequestType {}

const fetchRequests = async (): Promise<SupabaseRequest[]> => {
  return apiGetRequests();
};

export const useRequests = () => {
  return useQuery<SupabaseRequest[], Error>({
    queryKey: ["requests"],
    queryFn: fetchRequests,
  });
};

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
      invalidateRequestEvents(queryClient);
      toast.success(newRequest.request_number ? `Solicitud ${newRequest.request_number} creada.` : "Solicitud creada.");
    },
    onError: (error) => {
      toast.error("No se pudo enviar la solicitud.", {
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
      invalidateRequestEvents(queryClient);
      toast.success(`Estado actualizado a ${getRequestStatusLabel(updatedRequest.status)}.`);
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado de la solicitud.", {
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
      invalidateRequestEvents(queryClient);
      toast.success("Solicitud actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar la solicitud.", {
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
      toast.success("Solicitud actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar la solicitud.", {
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
      invalidateRequestEvents(queryClient);
      
      let message = "Datos guardados.";
      if (data.filePath) {
        message = variables.fileType === "quote" ? "Presupuesto subido." : variables.fileType === "po" ? "PO subido." : "Archivo subido.";
      } else if (variables.fileType === 'po' && data.poNumber) {
        message = `Número de PO ${data.poNumber} guardado.`;
      }

      toast.success(message);
    },
    onError: (error, variables) => {
      toast.error("No se pudo guardar el documento.", {
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
      invalidateRequestEvents(queryClient);
      toast.success("Solicitud eliminada.");
    },
    onError: (error) => {
      toast.error("No se pudo eliminar la solicitud.", {
        description: error.message,
      });
    },
  });
};

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
      invalidateRequestEvents(queryClient);
      toast.success("Reversión de recepción exitosa!", {
        description: "Artículos eliminados del inventario y estado establecido a Pedido.",
      });
    },
    onError: (error) => {
      toast.error("No se pudo revertir la recepción.", {
        description: error.message,
      });
    },
  });
};

interface SendEmailData {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  from?: string;
  // La URL aquí debe ser la RUTA DE ALMACENAMIENTO (storage path) para que la función Edge pueda descargarla.
  attachments?: { name: string; url: string }[]; 
}

export const useSendEmail = () => {
  return useMutation<void, Error, SendEmailData>({
    mutationFn: async (emailData) => {
      await apiSendEmail(emailData);
    },
    onSuccess: () => {
      toast.success("Correo enviado.");
    },
    onError: (error) => {
      toast.error("No se pudo enviar el correo.", {
        description: error.message,
      });
    },
  });
};