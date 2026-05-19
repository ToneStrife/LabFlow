"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mobileDialogClass, dialogFooterMobileClass } from "@/lib/layout";
import { Loader2 } from "lucide-react";
import { SupabaseRequest } from "@/data/types";

interface ApproveRequestListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  request: SupabaseRequest | null;
  onApproveOnly: (request: SupabaseRequest) => Promise<void>;
  onApproveAndSendEmail: (request: SupabaseRequest) => Promise<void>;
  isSubmitting: boolean;
}

const ApproveRequestListDialog: React.FC<ApproveRequestListDialogProps> = ({
  isOpen,
  onOpenChange,
  request,
  onApproveOnly,
  onApproveAndSendEmail,
  isSubmitting,
}) => {
  if (!request) return null;

  const approveButtonText = request.quote_url ? "Aprobar y Solicitar PO (Cómprame)" : "Aprobar y Solicitar Cotización (Correo)";
  const approveOnlyText = request.quote_url ? "Aprobar Solamente (a PO Solicitado)" : "Aprobar Solamente (a Cotización Solicitada)";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprobar Solicitud {request.request_number || request.id.substring(0, 8)}</DialogTitle>
          <DialogDescription>
            Elige cómo proceder con esta solicitud.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="outline" onClick={() => onApproveOnly(request)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : approveOnlyText}
          </Button>
          <Button onClick={() => onApproveAndSendEmail(request)} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : approveButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveRequestListDialog;