import React from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dialogFooterMobileClass, mobileDialogClass } from "@/lib/layout";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Qué pasa exactamente al confirmar. Sin esto, nadie sabe si se puede deshacer. */
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  isPending?: boolean;
  /** Las acciones que borran o deniegan van en rojo; el resto, en el color normal. */
  destructive?: boolean;
}

/** Confirmación de una acción que no se deshace con un clic. */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  isPending = false,
  destructive = true,
}) => (
  <Dialog open={open} onOpenChange={(abierto) => !isPending && onOpenChange(abierto)}>
    <DialogContent className={cn(mobileDialogClass, "sm:max-w-[440px]")}>
      <DialogHeader className="text-left">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className={dialogFooterMobileClass}>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          variant={destructive ? "destructive" : "default"}
          onClick={() => void onConfirm()}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ConfirmDialog;
