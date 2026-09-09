"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/components/SessionContextProvider";
import { TODAS_LAS_SEDES } from "@/lib/sedes";

const STORAGE_KEY = "labflow_sede_activa";

interface SedeContextType {
  /** null = Todas las sedes visibles */
  sedeActiva: string | null;
  setSedeActiva: (sedeId: string | null) => void;
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

const readStoredSede = (): string | null | undefined => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return undefined;
    return stored === TODAS_LAS_SEDES ? null : stored;
  } catch {
    return undefined;
  }
};

export const SedeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useSession();
  const [sedeActiva, setSedeActivaState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const stored = readStoredSede();
    if (stored !== undefined) {
      setSedeActivaState(stored);
      setInitialized(true);
      return;
    }

    if (profile) {
      setSedeActivaState(profile.default_sede_id ?? null);
      setInitialized(true);
    }
  }, [profile, initialized]);

  const setSedeActiva = (sedeId: string | null) => {
    setSedeActivaState(sedeId);
    try {
      localStorage.setItem(STORAGE_KEY, sedeId ?? TODAS_LAS_SEDES);
    } catch {
      /* localStorage no disponible */
    }
  };

  return (
    <SedeContext.Provider value={{ sedeActiva, setSedeActiva }}>
      {children}
    </SedeContext.Provider>
  );
};

export const useSedeActiva = (): SedeContextType => {
  const context = useContext(SedeContext);
  if (!context) {
    throw new Error("useSedeActiva debe usarse dentro de SedeContextProvider");
  }
  return context;
};
