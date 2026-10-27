import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { EmailTemplate } from '@/data/types';

export const useEmailTemplates = () => {
  return useQuery<EmailTemplate[], Error>({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('*');
      if (error) throw new Error(error.message);
      return (data || []) as EmailTemplate[];
    },
  });
};

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
      const { data: updatedData, error } = await supabase
        .from('email_templates')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Fallo al actualizar plantilla: ${error.message}`);
      }
      return updatedData as EmailTemplate;
    },
    onSuccess: (data) => {
      toast.success(`Plantilla "${data.template_name}" actualizada exitosamente!`);
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

/** Copia una plantilla global (o existente) como plantilla de un laboratorio. */
export const useCreateLabEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateName,
      subjectTemplate,
      bodyTemplate,
      labId,
    }: {
      templateName: string;
      subjectTemplate: string;
      bodyTemplate: string;
      labId: string;
    }) => {
      const { data, error } = await supabase
        .from('email_templates')
        .insert({
          template_name: templateName,
          subject_template: subjectTemplate,
          body_template: bodyTemplate,
          lab_id: labId,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as EmailTemplate;
    },
    onSuccess: (data) => {
      toast.success(`Copia de «${data.template_name}» creada para el laboratorio.`);
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'No se pudo crear la plantilla del laboratorio.');
    },
  });
};
