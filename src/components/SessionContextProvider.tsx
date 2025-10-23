"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  supabase: SupabaseClient;
  updateProfile: (data: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null }) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', error);
      return null; // Return null on error
    }
    return data;
  };

  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    const initializeSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(initialSession);
        if (initialSession?.user) {
          const profileData = await fetchProfile(initialSession.user.id);
          if (isMounted) setProfile(profileData);
        } else {
          if (isMounted) setProfile(null);
        }
      } catch (error) {
        console.error("Error during initial session fetch:", error);
        if (isMounted) {
          setSession(null);
          setProfile(null);
          toast.error("Failed to load session.", { description: (error as Error).message });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id);
        if (isMounted) setProfile(profileData);
      } else {
        if (isMounted) setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run once on mount

  const updateProfile = async (data: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null }) => {
    if (!session?.user) throw new Error("No user session found to update profile.");
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        avatar_url: data.avatar_url || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw error;

    // Refresh profile data after update
    await fetchProfile(session.user.id); // This will call setProfile internally
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out.", {
        description: error.message || "Please try again.",
      });
    } else {
      toast.info("You have been signed out.");
      // The onAuthStateChange listener will handle setting session and profile to null
    }
  };

  const value = {
    session,
    profile,
    loading,
    supabase,
    updateProfile,
    signOut,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};