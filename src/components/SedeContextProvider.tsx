"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/components/SessionContextProvider";
import { TODAS_LAS_SEDES, isValidSedeId } from "@/lib/sedes";

const STORAGE_KEY = "labflow_sede_activa";

interface SedeContextType {
  /** null = Todas las sedes visibles */
  sedeActiva: string | null;
  setSedeActiva: (sedeId: string | null) => void;
  /** false hasta leer localStorage / perfil */
  sedeLista: boolean;
}

const SedeContext = createContext<SedeContextType | undefined>(undefined);

const normalizeStoredSede = (raw: string | null): string | null | undefined => {
  if (raw === null) return undefined;
  if (raw === TODAS_LAS_SEDES) return null;
  if (isValidSedeId(raw)) return raw;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return undefined;
};

const readStoredSede = (): string | null | undefined => {
  try {
    return normalizeStoredSede(localStorage.getItem(STORAGE_KEY));
  } catch {
    return undefined;
  }
};

export const SedeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useSession();
  const [sedeActiva, setSedeActivaState] = useState<string | null>(() => {
    const stored = readStoredSede();
    return stored === undefined ? null : stored;
  });
  const [sedeLista, setSedeLista] = useState(() => readStoredSede() !== undefined);

  useEffect(() => {
    if (sedeLista) return;

    const stored = readStoredSede();
    if (stored !== undefined) {
      setSedeActivaState(stored);
      setSedeLista(true);
      return;
    }

    if (profile) {
      const fromProfile = isValidSedeId(profile.default_sede_id)
        ? profile.default_sede_id
        : null;
      setSedeActivaState(fromProfile);
      setSedeLista(true);
    }
  }, [profile, sedeLista]);

  const setSedeActiva = (sedeId: string | null) => {
    const next = sedeId && isValidSedeId(sedeId) ? sedeId : null;
    setSedeActivaState(next);
    setSedeLista(true);
    try {
      localStorage.setItem(STORAGE_KEY, next ?? TODAS_LAS_SEDES);
    } catch {
      /* localStorage no disponible */
    }
  };

  return (
    <SedeContext.Provider value={{ sedeActiva, setSedeActiva, sedeLista }}>
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
