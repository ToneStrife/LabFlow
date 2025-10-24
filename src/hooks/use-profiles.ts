import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile } from "@/data/mockData"; 
import { toast } from "sonner";
import { apiGetProfiles, apiUpdateProfile, apiDeleteProfile, apiCreateAccountManager } from "@/integrations/api"; // Importar apiCreateAccountManager

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

// Nuevo hook para añadir un gestor de cuentas
interface AddAccountManagerData {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
}

export const useAddAccountManager = () => {
  const queryClient = useQueryClient();
  return useMutation<Profile, Error, AddAccountManagerData>({
    mutationFn: async (data) => {
      return apiCreateAccountManager(data);
    },
    onSuccess: (newManager) => {
      queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
      queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      toast.success("Account Manager added successfully!", {
        description: `Manager: ${getFullName(newManager)}`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add account manager.", {
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