import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SentEmail } from '@/data/types';

export const useEmailLogs = () => {
  return useQuery<SentEmail[], Error>({
    queryKey: ['emailLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sent_emails')
        .select(`
          *,
          sent_by_profile:profiles(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      
      // Map the data to include the full name of the sender
      return data.map(log => ({
        ...log,
        sent_by_name: log.sent_by_profile ? `${log.sent_by_profile.first_name || ''} ${log.sent_by_profile.last_name || ''}`.trim() : 'Unknown User',
      })) as SentEmail[]; // Cast to SentEmail[]
    },
  });
};