import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { EmailTemplate } from '@/data/types';

// Hook to fetch all email templates
export const useEmailTemplates = () => {
  return useQuery<EmailTemplate[], Error>({
    queryKey: ['email_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('email_templates').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

// Hook to update an email template
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
        throw new Error(`Failed to update template: ${error.message}`);
      }
      return updatedData;
    },
    onSuccess: (data) => {
      toast.success(`Template "${data.template_name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};