import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile } from "@/data/mockData";
import { toast } from "sonner";
import { apiGetProfiles, apiUpdateProfile } from "@/integrations/api"; // Importar desde la nueva API simulada

export interface Profile extends MockProfile {}

// --- Fetch Hook ---
const fetchAllProfiles = async (): Promise<Profile[]> => {
  return apiGetProfiles(); // Usar la función de la API simulada
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
      const profiles = await apiGetProfiles(); // Usar la función de la API simulada
      return profiles.filter(profile => profile.role === "Account Manager");
    },
  });
};

// La función de actualización ahora también usará la API simulada
export const updateMockProfile = (id: string, data: Partial<Profile>) => {
  apiUpdateProfile(id, data);
};

export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id;
};