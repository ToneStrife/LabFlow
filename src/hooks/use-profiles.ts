import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile } from "@/data/mockData"; 
import { toast } from "sonner";
import { apiGetProfiles, apiUpdateProfile, apiDeleteProfile, apiInviteUser } from "@/integrations/api";

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

// useAccountManagerProfiles se ha eliminado y se reemplaza por useAccountManagers en src/hooks/use-account-managers.ts
// export const useAccountManagerProfiles = () => {
//   return useQuery<Profile[], Error>({
//     queryKey: ["accountManagers"],
//     queryFn: async () => {
//       const profiles = await apiGetProfiles();
//       return profiles.filter(profile => profile.role === "Account Manager");
//     },
//   });
// };

// --- Mutation Hooks for Profiles ---

interface ProfileUpdateFormData { 
  first_name?: string;
  last_name?: string;
  email?: string; 
  role?: "Requester" | "Account Manager" | "Admin";
}

interface InviteUserData {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: Profile['role'];
}

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, InviteUserData>({
    mutationFn: async (data) => {
      return apiInviteUser(data);
    },
    onSuccess: (invitedUser) => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Invitation sent successfully!", {
        description: `Email: ${invitedUser.user.email}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to send invitation.", {
        description: error.message,
      });
    },
  });
};


export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; data: Partial<ProfileUpdateFormData> }>({
    mutationFn: async ({ id, data }) => {
      const { email, ...profileData } = data;
      return apiUpdateProfile(id, profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile.", {
        description: error.message,
      });
    },
  });
};

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