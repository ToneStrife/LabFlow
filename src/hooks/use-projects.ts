import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Project } from "@/data/types";
import { toast } from "sonner";
import { apiGetProjects, apiAddProject, apiUpdateProject, apiDeleteProject } from "@/integrations/api";

// --- Fetch Hook ---
const fetchProjects = async (): Promise<Project[]> => {
  return apiGetProjects();
};

export const useProjects = () => {
  return useQuery<Project[], Error>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
};

// --- Mutation Hooks ---

interface ProjectFormData {
  name: string;
  code: string;
}

// Add Project
export const useAddProject = () => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, ProjectFormData>({
    mutationFn: async (data) => {
      return apiAddProject(data);
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project added successfully!", {
        description: `${newProject.name} (${newProject.code})`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add project.", {
        description: error.message,
      });
    },
  });
};

// Update Project
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation<Project, Error, { id: string; data: Partial<ProjectFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateProject(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update project.", {
        description: error.message,
      });
    },
  });
};

// Delete Project
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteProject(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete project.", {
        description: error.message,
      });
    },
  });
};