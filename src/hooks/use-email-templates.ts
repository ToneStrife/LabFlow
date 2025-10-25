import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmailTemplate } from "@/data/types";
import { toast } from "sonner";
import { apiGetEmailTemplates, apiAddEmailTemplate, apiUpdateEmailTemplate, apiDeleteEmailTemplate } from "@/integrations/api";

// --- Fetch Hook ---
const fetchEmailTemplates = async (): Promise<EmailTemplate[]> => {
  return apiGetEmailTemplates();
};

export const useEmailTemplates = () => {
  return useQuery<EmailTemplate[], Error>({
    queryKey: ["emailTemplates"],
    queryFn: fetchEmailTemplates,
  });
};

// --- Mutation Hooks ---

interface EmailTemplateFormData {
  template_name: string;
  subject_template: string;
  body_template: string;
}

// Add Email Template
export const useAddEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<EmailTemplate, Error, EmailTemplateFormData>({
    mutationFn: async (data) => {
      return apiAddEmailTemplate(data);
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Plantilla de correo electrónico añadida con éxito!", {
        description: `Plantilla: ${newTemplate.template_name}`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al añadir la plantilla de correo electrónico.", {
        description: error.message,
      });
    },
  });
};

// Update Email Template
export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<EmailTemplate, Error, { id: string; data: Partial<EmailTemplateFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateEmailTemplate(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Plantilla de correo electrónico actualizada con éxito!");
    },
    onError: (error) => {
      toast.error("Fallo al actualizar la plantilla de correo electrónico.", {
        description: error.message,
      });
    },
  });
};

// Delete Email Template
export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteEmailTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Plantilla de correo electrónico eliminada con éxito!");
    },
    onError: (error) => {
      toast.error("Fallo al eliminar la plantilla de correo electrónico.", {
        description: error.message,
      });
    },
  });
};