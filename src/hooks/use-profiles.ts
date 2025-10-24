import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile } from "@/data/mockData"; 
import { toast } from "sonner";
import { apiGetProfiles, apiUpdateProfile, apiDeleteProfile, apiInviteUser } from "@/integrations/api"; // apiCreateAccountManager se eliminará

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
      const profiles = await apiGetProfiles(); // Usar la función de la API de Supabase
      return profiles.filter(profile => profile.role === "Account Manager");
    },
  });
};

// --- Mutation Hooks for Profiles ---

interface ProfileUpdateFormData { 
  first_name?: string;
  last_name?: string;
  email?: string; 
  role?: "Requester" | "Account Manager" | "Admin";
}

// useAddProfile se ha eliminado. Los nuevos perfiles se crean a través del trigger de registro de auth.users.
// useAddAccountManager se elimina y se reemplaza por useInviteUser con un rol específico.

// Nuevo hook para invitar a un usuario (actualizado para aceptar un rol)
interface InviteUserData {
  email: string;
  first_name?: string;
  last_name?: string;
  role?: Profile['role']; // Añadir campo de rol opcional
}

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, InviteUserData>({
    mutationFn: async (data) => {
      return apiInviteUser(data);
    },
    onSuccess: (invitedUser) => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] }); // Invalidar también los managers
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


// Actualizar Perfil (usado para el perfil del usuario actual y potencialmente para managers)
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; data: Partial<ProfileUpdateFormData> }>({
    mutationFn: async ({ id, data }) => {
      // Filtrar el email ya que no se actualiza directamente en la tabla de perfiles
      const { email, ...profileData } = data;
      return apiUpdateProfile(id, profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      queryClient.invalidateQueries({ queryKey: ["session"] }); // Invalidar la sesión para volver a obtener el perfil si es el usuario actual
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile.", {
        description: error.message,
      });
    },
  });
};

// Eliminar Perfil
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