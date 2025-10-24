import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile as MockProfile, updateMockProfile as updateMockProfileData } from "@/data/mockData";
import { toast } from "sonner";

export interface Profile extends MockProfile {}

// --- Fetch Hook ---
const fetchAllProfiles = async (): Promise<Profile[]> => {
  // Fetch from the new backend API
  const response = await fetch('http://localhost:3001/api/profiles');
  if (!response.ok) {
    throw new Error('Failed to fetch profiles from backend');
  }
  return response.json();
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
      const profiles = await fetchAllProfiles(); // Use the new fetch function
      return profiles.filter(profile => profile.role === "Account Manager");
    },
  });
};

// Export the mock update function for use in Profile page
// This will still update the local mock data for now, until we implement a PUT endpoint in the backend
export const updateMockProfile = (id: string, data: Partial<Profile>) => {
  updateMockProfileData(id, data);
};

export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id;
};