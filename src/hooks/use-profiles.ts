import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/data/types"; 
import { toast } from "sonner";
import { apiGetProfiles, apiUpdateProfile, apiDeleteProfile, apiInviteUser } from "@/integrations/api";

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
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null; 
  role?: "Requester" | "Account Manager" | "Admin";
}

interface InviteUserData {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
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
      toast.success("Invitación enviada exitosamente!", {
        description: `Email: ${invitedUser.user.email}`,
      });
    },
    onError: (error) => {
      toast.error("Fallo al enviar la invitación.", {
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
      toast.success("Perfil actualizado exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al actualizar el perfil.", {
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
      toast.success("Perfil eliminado exitosamente!");
    },
    onError: (error) => {
      toast.error("Fallo al eliminar el perfil.", {
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