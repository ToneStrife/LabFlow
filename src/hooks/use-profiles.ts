import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  role: string; // Added role
}

const fetchAllProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Error fetching all profiles:", error);
    throw new Error(error.message);
  }
  return data as Profile[];
};

export const useAllProfiles = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["allProfiles"],
    queryFn: fetchAllProfiles,
  });
};

// New hook to fetch only Account Manager profiles
export const useAccountManagerProfiles = () => {
  return useQuery<Profile[], Error>({
    queryKey: ["accountManagers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "Account Manager")
        .order("first_name", { ascending: true });

      if (error) {
        console.error("Error fetching account manager profiles:", error);
        throw new Error(error.message);
      }
      return data as Profile[];
    },
  });
};

// Helper function to get full name from profile data
export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id; // Fallback to ID if no name is set
};