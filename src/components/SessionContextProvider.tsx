"use client";

import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Profile } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Session } from '@supabase/supabase-js';
import { useNavigate } from "react-router-dom";
import { initialAuthHash, isPasswordSetupLink } from "@/lib/auth-hash";

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
  // De quien es la sesion que ya tenemos cargada, para distinguir un cambio
  // de usuario de una simple revalidacion del token.
  const usuarioCargadoRef = React.useRef<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Función unificada para obtener la sesión y el perfil
  const fetchSessionAndProfile = async (currentSession: Session | null) => {
    if (!currentSession) {
      usuarioCargadoRef.current = null;
      setSession(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    usuarioCargadoRef.current = currentSession.user.id;
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
      // Si el perfil no se encuentra (PGRST116), asumimos que el trigger lo está creando
      // o que el usuario no tiene un perfil. No intentamos insertarlo desde el cliente
      // para evitar violaciones de RLS.
      setProfile(null);
    }
    
    // Solo establecer loading en false después de que el perfil haya sido procesado
    setLoading(false);
  };

  // Encaminar la vuelta de los correos de Supabase Auth. Supabase deja sus
  // parametros en el fragmento de la URL, que HashRouter interpreta como una
  // ruta inexistente: sin esto, el enlace del correo acaba en el 404 de la
  // app. Esperamos a que loading sea false para no navegar antes de que
  // supabase-js haya leido el token del fragmento, y usamos useLayoutEffect
  // para redirigir antes de pintar el 404.
  // Solo la primera vez: initialAuthHash no cambia en toda la vida de la
  // pagina, asi que sin este cerrojo el usuario volveria a /reset-password (o
  // a /login) cada vez que la sesion cambiase.
  const authLinkHandled = React.useRef(false);

  useLayoutEffect(() => {
    if (loading || authLinkHandled.current) return;

    if (initialAuthHash.error) {
      authLinkHandled.current = true;
      toast.error("El enlace no es válido o ha caducado.", {
        description:
          "Pide uno nuevo desde \"¿Has olvidado la contraseña?\" o a un administrador.",
      });
      navigate("/login", { replace: true });
      return;
    }

    if (isPasswordSetupLink) {
      authLinkHandled.current = true;

      if (session) {
        navigate("/reset-password", { replace: true });
        return;
      }

      // Venia un token en el enlace pero no ha servido para abrir sesion:
      // caducado o ya usado. Sin esto el usuario se queda mirando el 404.
      toast.error("El enlace ya no sirve.", {
        description: "Puede que haya caducado o que ya lo hayas usado. Pide uno nuevo.",
      });
      navigate("/login", { replace: true });
    }
  }, [loading, session, navigate]);

  useEffect(() => {
    // 1. Cargar la sesión inicial
    const loadInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      await fetchSessionAndProfile(initialSession);
    };
    
    loadInitialSession();

    // 2. Configurar el listener de cambios de estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      console.log("Auth State Change:", event);

      if (event === 'PASSWORD_RECOVERY') {
        setLoading(true);
        fetchSessionAndProfile(nextSession).then(() => {
          navigate("/reset-password", { replace: true });
        });
        return;
      }
      
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        // Ojo con lo que se hace aqui. Al volver a esta pestaña del navegador,
        // supabase-js revalida la sesion y dispara uno de estos eventos. Si
        // pusieramos loading en true, AppRoutes cambiaria a la pantalla de
        // carga y desmontaria toda la aplicacion para volver a montarla: se
        // cerraria el dialogo que tuvieras abierto, perdiendo lo escrito, y
        // las paginas volverian al principio. Asi que la sesion se actualiza
        // en segundo plano, sin tocar loading.
        const mismoUsuario = usuarioCargadoRef.current === (nextSession?.user?.id ?? null);

        if (mismoUsuario) {
          // Solo ha cambiado el token. El perfil sigue siendo el mismo, asi
          // que no hace falta volver a pedirlo ni invalidar nada.
          setSession(nextSession);
          return;
        }

        fetchSessionAndProfile(nextSession);

        // Invalidar consultas relacionadas con el usuario
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["allProfiles"] });
        queryClient.invalidateQueries({ queryKey: ["accountManagers"] });
      } else if (event === 'SIGNED_OUT') {
        usuarioCargadoRef.current = null;
        setSession(null);
        setProfile(null);
        setLoading(false);
        queryClient.invalidateQueries(); // Limpiar toda la caché al cerrar sesión
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [queryClient, navigate]);

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