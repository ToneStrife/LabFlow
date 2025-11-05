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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Info } from "lucide-react";
import { FileType } from "@/hooks/use-requests";
import { toast } from "sonner";
import FileUploadInput from "../FileUploadInput";

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File | null, poNumber?: string) => Promise<void>;
  isUploading: boolean;
  fileType: FileType; // 'quote' | 'po' | 'slip'
  draftKey?: string;   // pásame algo estable (p.ej. requestId)
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  onUpload,
  isUploading,
  fileType,
  draftKey = "global",
}) => {
  const PERSIST_KEY = React.useMemo(
    () => `uploadDialog:${fileType}:${draftKey}`,
    [fileType, draftKey]
  );

  // selectedFile es el objeto File real (solo existe en la sesión actual)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [poNumber, setPoNumber] = React.useState<string>("");
  
  // --- RESTORE PO NUMBER AL MONTAR
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved) {
        setPoNumber(saved.poNumber ?? "");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PERSIST_KEY]);

  // --- AUTOSAVE PO NUMBER
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ poNumber }));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [poNumber, PERSIST_KEY]);

  // --- Guardar PO NUMBER en visibilitychange
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ poNumber }));
      } catch {}
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [poNumber, PERSIST_KEY]);

  const clearDraft = React.useCallback(() => {
    try { localStorage.removeItem(PERSIST_KEY); } catch {}
    setSelectedFile(null);
    setPoNumber("");
  }, [PERSIST_KEY]);

  // Limpiar el objeto File al cerrar el diálogo
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleFileChange = (fileList: FileList | null) => {
    const f = fileList && fileList.length > 0 ? fileList[0] : null;
    setSelectedFile(f);
  };

  const handleSubmit = async () => {
    const isPoUpload = fileType === "po";
    const isQuoteUpload = fileType === "quote";
    const isSlipUpload = fileType === "slip";

    // Si el archivo es obligatorio y no está en la sesión actual (selectedFile),
    // el usuario debe volver a seleccionarlo.
    if ((isQuoteUpload || isSlipUpload) && !selectedFile) {
        toast.error("Archivo obligatorio", { description: "Debes seleccionar un archivo para continuar." });
        return;
    }
    
    if (isPoUpload) {
      if (!poNumber.trim() && !selectedFile) {
        toast.error("Faltan datos", { description: "Indica un número de PO y/o selecciona un archivo." });
        return;
      }
      await onUpload(selectedFile, poNumber.trim() || undefined);
    } else if (isQuoteUpload || isSlipUpload) {
      // Si llegamos aquí, selectedFile no es null (por la comprobación anterior)
      await onUpload(selectedFile, poNumber.trim() || undefined);
    }

    clearDraft();
    onOpenChange(false);
  };

  const isSubmitDisabled =
    isUploading ||
    (fileType === "quote" && !selectedFile) ||
    (fileType === "slip" && !selectedFile) ||
    (fileType === "po" && !poNumber.trim() && !selectedFile);

  const getTitle = () =>
    fileType === "quote" ? "Subir Archivo de Cotización"
    : fileType === "po"   ? "Subir Archivo de Orden de Compra"
    : fileType === "slip" ? "Subir Albarán"
    : "Subir Archivo";

  const getFileLabel = () =>
    fileType === "quote" ? "Archivo de Cotización (Obligatorio)"
    : fileType === "po"   ? "Archivo de PO (Opcional)"
    : fileType === "slip" ? "Archivo de Albarán (Opcional)"
    : "Archivo";

  // Determinar qué metadata mostrar: solo el archivo seleccionado (si existe)
  const fileMetaToDisplay = selectedFile ? { name: selectedFile.name, size: selectedFile.size } : null;
  
  // Ya no mostramos la advertencia de archivo perdido, simplemente el campo aparece vacío si se recarga.

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Mantén el contenido montado incluso cuando esté cerrado */}
      <DialogContent 
        className="sm:max-w-[425px]" 
        forceMount
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {fileType === "po"
              ? "Introduce el número de PO y/o sube el archivo."
              : "Selecciona un archivo para subir."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {fileType === "po" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="poNumber" className="text-right">
                Número de PO {fileType === "po" && !selectedFile ? <span className="text-red-500">*</span> : "(Opcional)"}
              </Label>
              <Input
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="col-span-3"
                placeholder="ej. PO-12345"
                disabled={isUploading}
              />
            </div>
          )}

          <FileUploadInput
            label={getFileLabel()}
            onChange={handleFileChange}
            disabled={isUploading}
            accept="image/*,application/pdf"
            currentFileMeta={fileMetaToDisplay} // Pasar la metadata para la visualización
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
              </>
            ) : fileType === "po" ? (
              "Guardar Detalles de PO"
            ) : (
              "Subir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;