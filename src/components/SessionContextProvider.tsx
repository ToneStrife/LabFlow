"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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
  supabase: SupabaseClient;
  updateProfile: (data: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null }) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else if (data) {
      setProfile(data);
    } else {
      setProfile(null);
    }
  };

  const updateProfile = async (data: { first_name?: string | null; last_name?: string | null; avatar_url?: string | null }) => {
    if (!session?.user) {
      throw new Error("No user session found to update profile.");
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        avatar_url: data.avatar_url || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    // Refresh profile data after update
    await fetchProfile(session.user.id);
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
      navigate('/login');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const handleSession = async (currentSession: Session | null) => {
      if (!isMounted) return;

      setSession(currentSession);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
      }
      
      // Only set loading to false after the very first session check is complete
      if (loading) {
        setLoading(false);
      }

      if (!currentSession && window.location.pathname !== '/login') {
        navigate('/login');
      } else if (currentSession && window.location.pathname === '/login') {
        navigate('/dashboard');
      }
    };

    // 1. Get initial session status
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleSession(initialSession);
    }).catch((err) => {
      console.error("Error fetching initial session:", err);
      if (isMounted) {
        setLoading(false);
        navigate('/login');
      }
    });

    // 2. Set up listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        handleSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, loading]); // Include loading in dependency array to ensure handleSession can check its value

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading application...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, profile, supabase, updateProfile, signOut }}>
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