import React, { useEffect, useMemo } from "react";
import { useLabs, useMyLabMemberships, useSedes } from "@/hooks/use-labs";
import { setSedesCatalog, sedeFromRecord, SEDES_FALLBACK, type Sede } from "@/lib/sedes";
import type { Lab, LabMember } from "@/data/types";
import { useSession } from "@/components/SessionContextProvider";
import { isAdmin } from "@/lib/permissions";

interface LabsCatalogContextValue {
  labs: Lab[];
  sedes: Sede[];
  memberships: LabMember[];
  isAppAdmin: boolean;
  loading: boolean;
}

const LabsCatalogContext = React.createContext<LabsCatalogContextValue | undefined>(undefined);

export const LabsCatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useSession();
  const { data: labs = [], isLoading: loadingLabs } = useLabs();
  const { data: sedeRows = [], isLoading: loadingSedes } = useSedes();
  const { data: memberships = [], isLoading: loadingMembers } = useMyLabMemberships();

  const sedes = useMemo(() => {
    if (!sedeRows.length) return SEDES_FALLBACK;
    return sedeRows.map(sedeFromRecord);
  }, [sedeRows]);

  useEffect(() => {
    setSedesCatalog(sedes);
  }, [sedes]);

  const value: LabsCatalogContextValue = {
    labs,
    sedes,
    memberships,
    isAppAdmin: isAdmin(profile?.role) || Boolean((profile as { is_owner?: boolean } | null)?.is_owner),
    loading: loadingLabs || loadingSedes || loadingMembers,
  };

  return <LabsCatalogContext.Provider value={value}>{children}</LabsCatalogContext.Provider>;
};

export const useLabsCatalog = (): LabsCatalogContextValue => {
  const ctx = React.useContext(LabsCatalogContext);
  if (!ctx) {
    throw new Error("useLabsCatalog debe usarse dentro de LabsCatalogProvider");
  }
  return ctx;
};
