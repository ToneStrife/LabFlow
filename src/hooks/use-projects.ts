import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Project } from '@/data/types';
import { ProjectFormValues } from '@/components/ProjectForm';

// Hook to fetch all projects
export const useProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw new Error(error.message);
      return data || [];
    },
  });
};

// Hook to add a new project
export const useAddProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (project: ProjectFormValues) => {
      const { data, error } = await supabase.from('projects').insert([project]).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Project added successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      toast.error('Failed to add project.', { description: error.message });
    },
  });
};

// Hook to update a project
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectFormValues }) => {
      const { data: updatedData, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return updatedData;
    },
    onSuccess: () => {
      toast.success('Project updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      toast.error('Failed to update project.', { description: error.message });
    },
  });
};

// Hook to delete a project
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast.success('Project deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};