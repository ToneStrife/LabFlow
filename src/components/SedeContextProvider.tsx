import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/components/SessionContextProvider";
import { TODAS_LAS_SEDES, isValidSedeId } from "@/lib/sedes";
import { isAdmin } from "@/lib/permissions";

const STORAGE_KEY = "labflow_sede_activa";

interface SedeContextType {
  /** null = Todas las sedes visibles (solo Admin/owner) */
  sedeActiva: string | null;
  setSedeActiva: (sedeId: string | null) => void;
  /** false hasta leer localStorage / perfil */
  sedeLista: boolean;
  /** Si el usuario puede elegir «Todas» */
  puedeVerTodas: boolean;
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
  const puedeVerTodas = Boolean(isAdmin(profile?.role) || profile?.is_owner);
  const [sedeActiva, setSedeActivaState] = useState<string | null>(() => {
    const stored = readStoredSede();
    return stored === undefined ? null : stored;
  });
  const [sedeLista, setSedeLista] = useState(() => readStoredSede() !== undefined);

  useEffect(() => {
    if (sedeLista) return;

    const stored = readStoredSede();
    if (stored !== undefined) {
      if (stored === null && !puedeVerTodas && profile) {
        const fromProfile = isValidSedeId(profile.default_sede_id)
          ? profile.default_sede_id
          : "cibm";
        setSedeActivaState(fromProfile);
      } else {
        setSedeActivaState(stored);
      }
      setSedeLista(true);
      return;
    }

    if (profile) {
      const fromProfile = isValidSedeId(profile.default_sede_id)
        ? profile.default_sede_id
        : puedeVerTodas
          ? null
          : "cibm";
      setSedeActivaState(fromProfile);
      setSedeLista(true);
    }
  }, [profile, sedeLista, puedeVerTodas]);

  // No-admins: no pueden quedarse en «Todas»
  useEffect(() => {
    if (!sedeLista || !profile) return;
    if (!puedeVerTodas && sedeActiva === null) {
      const fallback = isValidSedeId(profile.default_sede_id) ? profile.default_sede_id : "cibm";
      setSedeActivaState(fallback);
      try {
        localStorage.setItem(STORAGE_KEY, fallback);
      } catch {
        /* ignore */
      }
    }
  }, [puedeVerTodas, sedeActiva, sedeLista, profile]);

  const setSedeActiva = (sedeId: string | null) => {
    const next =
      sedeId === null
        ? puedeVerTodas
          ? null
          : isValidSedeId(profile?.default_sede_id)
            ? profile!.default_sede_id
            : "cibm"
        : isValidSedeId(sedeId)
          ? sedeId
          : null;
    setSedeActivaState(next);
    setSedeLista(true);
    try {
      localStorage.setItem(STORAGE_KEY, next ?? TODAS_LAS_SEDES);
    } catch {
      /* localStorage no disponible */
    }
  };

  return (
    <SedeContext.Provider value={{ sedeActiva, setSedeActiva, sedeLista, puedeVerTodas }}>
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
