"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog";
import { useRequests } from "@/hooks/use-requests";
import { useSession } from "@/components/SessionContextProvider";
import { ACTIVE_RECEIVE_REQUEST_KEY, receiveFlagKey } from "@/lib/receive-wizard-storage";

interface ReceiveWizardContextValue {
  openReceive: (requestId: string) => void;
  closeReceive: () => void;
  activeRequestId: string | null;
}

const ReceiveWizardContext = createContext<ReceiveWizardContextValue | undefined>(undefined);

export function ReceiveWizardProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const { data: requests, isLoading } = useRequests();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACTIVE_RECEIVE_REQUEST_KEY);
    } catch {
      return null;
    }
  });
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const restore = () => {
      try {
        const stored = sessionStorage.getItem(ACTIVE_RECEIVE_REQUEST_KEY);
        if (stored) setActiveRequestId(stored);
      } catch {
        /* ignore */
      }
    };
    restore();
    window.addEventListener("pageshow", restore);
    const onVisibility = () => {
      if (document.visibilityState === "visible") restore();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", restore);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!session && activeRequestId) {
      try {
        sessionStorage.removeItem(ACTIVE_RECEIVE_REQUEST_KEY);
      } catch {
        /* ignore */
      }
      setActiveRequestId(null);
    }
  }, [session, activeRequestId]);

  const openReceive = useCallback((requestId: string) => {
    try {
      sessionStorage.setItem(ACTIVE_RECEIVE_REQUEST_KEY, requestId);
      sessionStorage.setItem(receiveFlagKey(requestId), "1");
    } catch {
      /* ignore */
    }
    setActiveRequestId(requestId);
  }, []);

  const closeReceive = useCallback(() => {
    const id = activeRequestId;
    try {
      sessionStorage.removeItem(ACTIVE_RECEIVE_REQUEST_KEY);
      if (id) sessionStorage.removeItem(receiveFlagKey(id));
    } catch {
      /* ignore */
    }
    setActiveRequestId(null);
  }, [activeRequestId]);

  const request = useMemo(
    () => requests?.find((r) => r.id === activeRequestId) ?? null,
    [requests, activeRequestId]
  );

  const value = useMemo(
    () => ({ openReceive, closeReceive, activeRequestId }),
    [openReceive, closeReceive, activeRequestId]
  );

  const showLoadingShell = Boolean(activeRequestId && (!request?.items || request.items.length === 0));

  return (
    <ReceiveWizardContext.Provider value={value}>
      {children}

      {activeRequestId && request?.items && request.items.length > 0 && (
        <ReceiveItemsDialog
          isOpen
          onOpenChange={(open) => {
            if (!open) closeReceive();
          }}
          requestId={request.id}
          requestItems={request.items}
        />
      )}

      {portalReady &&
        showLoadingShell &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Reabriendo recepción..." : "Cargando solicitud..."}
            </p>
          </div>,
          document.body
        )}
    </ReceiveWizardContext.Provider>
  );
}

export function useReceiveWizard() {
  const ctx = useContext(ReceiveWizardContext);
  if (!ctx) {
    throw new Error("useReceiveWizard must be used within ReceiveWizardProvider");
  }
  return ctx;
}
