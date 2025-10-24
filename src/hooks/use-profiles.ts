import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetProfiles, apiAddProfile, apiUpdateProfile, apiDeleteProfile } from "@/integrations/api";

export interface Profile extends MockProfile {}

// --- Fetch Hook ---
const fetchAllProfiles = async (): Promise<Profile[]> => {
  return apiGetProfiles();
};

export const useAllProfiles = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["allProfiles"],
    queryFn: fetchAllProfiles,
  });
};

export const useAccountManagerProfiles = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["accountManagers"],
    queryFn: async () => {
      const profiles = await apiGetProfiles();
      return profiles.filter(profile => profile.role === "Account Manager");
    },
  });
};

// --- Mutation Hooks for Profiles ---

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  role: "Requester" | "Account Manager" | "Admin";
}

// Add Profile
export const useAddProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, ProfileFormData>({
    mutationFn: async (data) => {
      return apiAddProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: data.role,
      });
    },
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Profile added successfully!", {
        description: `Manager: ${getFullName(newProfile)}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add profile.", {
        description: error.message,
      });
    },
  });
};

// Update Profile (used for current user's profile and potentially for managers)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; data: Partial<ProfileFormData> }>({
    mutationFn: async ({ id, data }) => {
      return apiUpdateProfile(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      queryClient.invalidateQueries({ queryKey: ["session"] }); // Invalidate session to refetch profile if it's the current user
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile.", {
        description: error.message,
      });
    },
  });
};

// Delete Profile
export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      return apiDeleteProfile(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Profile deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete profile.", {
        description: error.message,
      });
    },
  });
};

export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id;
};