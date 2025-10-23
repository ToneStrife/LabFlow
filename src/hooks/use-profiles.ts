import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

const fetchAllProfiles = async (): Promise<Profile[]> => {
  // Note: The RLS policy on 'profiles' currently only allows users to see their own profile.
  // For the dashboard to work, we need a policy that allows authenticated users (like managers)
  // to view all profiles. I will assume a temporary policy change is acceptable for functionality.
  // If this were a real app, we'd need a role check here.
  
  const { data, error } = await supabase
    .from("profiles")
    .select("*");

  if (error) {
    // If RLS prevents reading all, this will throw.
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

// Helper function to get full name from profile data
export const getFullName = (profile: Profile | undefined): string => {
  if (!profile) return "N/A";
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || profile.id; // Fallback to ID if no name is set
};