"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session, User } from '@supabase/supabase-js';

interface SessionContextType {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Función unificada para obtener la sesión y el perfil
  const fetchSessionAndProfile = async (currentSession: Session | null) => {
    if (!currentSession) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    
    // 1. Intentar obtener el perfil
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching profile:", error);
      setProfile(null);
      toast.error("Error fetching user profile.", { description: error.message });
    } else if (profileData) {
      setProfile(profileData as Profile);
    } else {
      // 2. Fallback: Crear perfil si no existe (debería ser manejado por trigger)
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: currentSession.user.id,
          first_name: currentSession.user.user_metadata?.first_name || 'New',
          last_name: currentSession.user.user_metadata?.last_name || 'User',
          role: 'Requester',
          email: currentSession.user.email,
          notify_on_status_change: true,
          notify_on_new_request: true,
        })
        .select()
        .single();
      if (insertError) {
        console.error("Error creating default profile:", insertError);
        setProfile(null);
        toast.error("Error creating default user profile.", { description: insertError.message });
      } else {
        setProfile(newProfile as Profile);
        toast.success("Default profile created for new user.");
      }
    }
    
    // Solo establecer loading en false después de que el perfil haya sido procesado
    setLoading(false);
  };

  useEffect(() => {
    // 1. Cargar la sesión inicial
    const loadInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      await fetchSessionAndProfile(initialSession);
    };
    
    loadInitialSession();

    // 2. Configurar el listener de cambios de estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth State Change:", event);
      
      // Si el usuario inicia sesión o se refresca la sesión, recargamos todo
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Establecer loading en true temporalmente para evitar renderizados intermedios
        setLoading(true); 
        fetchSessionAndProfile(session);
        
        // Invalidar consultas relacionadas con el usuario
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
        queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
        queryClient.invalidateQueries(); // Limpiar toda la caché al cerrar sesión
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]); // Dependencias solo queryClient

  const login = async () => {
    console.log("Simulating login. Redirecting to login page handled by App.tsx");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out.", { description: error.message });
    } else {
      // El listener onAuthStateChange manejará la actualización del estado
      toast.info("You have been logged out.");
    }
  };

  return (
    <SessionContext.Provider value={{ session, profile, loading, login, logout }}>
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