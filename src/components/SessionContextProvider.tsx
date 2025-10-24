"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Session } from "@supabase/supabase-js";
import { createClient } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/use-profiles";
import { apiGetProfiles } from "@/integrations/supabase/api"; // Use the real API to fetch profiles

const supabase = createClient();

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  login: () => void; // Placeholder for redirect/triggering auth UI
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Hook to fetch the current user's profile based on session ID
const useCurrentProfile = (userId: string | undefined) => {
  return useQuery<Profile | null, Error>({
    queryKey: ["sessionProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      // Fetch all profiles and find the current user's profile
      const profiles = await apiGetProfiles();
      return profiles.find(p => p.id === userId) || null;
    },
    enabled: !!userId,
  });
};

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // 1. Handle Supabase Auth State Changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ["sessionProfile"] });
      queryClient.invalidateQueries(); // Invalidate all queries on auth change
    });

    // Fetch initial session state
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // 2. Fetch Profile based on current session
  const userId = session?.user?.id;
  const { data: profile, isLoading: isLoadingProfile } = useCurrentProfile(userId);

  const login = () => {
    // In a real app, this would redirect to the login page or open the Auth UI
    console.log("Simulating login redirect/action.");
    // Since we don't have a dedicated login page yet, this is a placeholder.
    // We will implement the login page next.
  };

  const logout = async () => {
    await supabase.auth.signOut();
    queryClient.clear(); // Clear all query cache on logout
  };

  return (
    <SessionContext.Provider value={{ 
      session, 
      profile: profile || null, 
      loading: loading || isLoadingProfile, 
      login, 
      logout 
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionContextProvider");
  }
  return context;
};