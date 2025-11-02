"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/data/types"; // Corrected import source
import { supabase } from "@/integrations/supabase/client"; // Importar cliente de Supabase
import { toast } from "sonner";
import { Session, User } from '@supabase/supabase-js'; // Import Supabase Session type

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

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 significa "no se encontraron filas"
          console.error("Error fetching profile:", error);
          setProfile(null);
          toast.error("Error fetching user profile.", { description: error.message });
        } else if (profileData) {
          setProfile(profileData as Profile); // Cast to Profile
        } else {
          // Si no se encuentra el perfil, crear uno básico.
          // Esto debería ser manejado por el trigger `handle_new_user` en Supabase.
          // Este es un fallback para desarrollo.
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              first_name: session.user.user_metadata?.first_name || 'New',
              last_name: session.user.user_metadata?.last_name || 'User',
              role: 'Requester', // Rol por defecto
              email: session.user.email, // Include email
              notify_on_status_change: true, // Default value
              notify_on_new_request: true, // Default value
            })
            .select()
            .single();
          if (insertError) {
            console.error("Error creating default profile:", insertError);
            setProfile(null);
            toast.error("Error creating default user profile.", { description: insertError.message });
          } else {
            setProfile(newProfile as Profile); // Cast to Profile
            toast.success("Default profile created for new user.");
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        // Volver a obtener el perfil cuando el estado de autenticación cambie (ej. después de iniciar sesión/registrarse)
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
        queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [queryClient]);

  const login = async () => {
    // En una aplicación real, esto navegaría a una página de inicio de sesión.
    // Por ahora, solo registraremos un mensaje.
    console.log("Simulating login. In a real app, you'd go to a login page.");
    // La redirección a la página de login se maneja en App.tsx
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out.", { description: error.message });
    } else {
      setSession(null);
      setProfile(null);
      queryClient.invalidateQueries();
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