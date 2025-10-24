"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/hooks/use-profiles"; // Assuming Profile interface exists

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching initial session:", sessionError);
        setSession(null);
        setProfile(null);
      } else {
        setSession(session);
        if (session) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error("Error fetching profile:", profileError);
            setProfile(null);
          } else if (profileData) {
            setProfile(profileData as Profile);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change:", event, currentSession);
      setSession(currentSession);
      if (currentSession) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Error fetching profile on auth state change:", profileError);
          setProfile(null);
        } else if (profileData) {
          setProfile(profileData as Profile);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      queryClient.invalidateQueries(); // Invalidate all queries on auth state change
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <SessionContext.Provider value={{ session, profile, loading }}>
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