import { useQuery } from "@tanstack/react-query";
import { getMockProfiles, updateMockProfile as updateMockProfileData, Profile as MockProfile } from "@/data/mockData";

export interface Profile extends MockProfile {} // Use the interface from mockData

const fetchAllProfiles = async (): Promise<Profile[]> => {
  return getMockProfiles();
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
      const profiles = await getMockProfiles();
      return profiles.filter(profile => profile.role === "Account Manager");
    },
  });
};

// Export the mock update function for use in Profile page
export const updateMockProfile = (id: string, data: Partial<Profile>) => {
  updateMockProfileData(id, data);
};

export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id;
};