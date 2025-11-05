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
  // savedFileMeta es la metadata persistida (nombre, tamaño)
  const [savedFileMeta, setSavedFileMeta] = React.useState<{ name: string; size: number } | null>(null);

  // --- RESTORE SIEMPRE AL MONTAR (independiente de isOpen)
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved) {
        setPoNumber(saved.poNumber ?? "");
        setSavedFileMeta(saved.fileMeta ?? null);
        setSelectedFile(null); // El objeto File nunca se restaura
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PERSIST_KEY]);

  // --- AUTOSAVE SIEMPRE (no depende de isOpen)
  React.useEffect(() => {
    const id = setTimeout(() => {
      // Si hay un archivo seleccionado en la sesión actual, usamos su metadata.
      // Si no, usamos la metadata guardada previamente.
      const meta = selectedFile ? { name: selectedFile.name, size: selectedFile.size } : savedFileMeta;
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ poNumber, fileMeta: meta }));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [poNumber, selectedFile, savedFileMeta, PERSIST_KEY]);

  // --- Guardar en visibilitychange (para Memory Saver)
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden") return;
      const meta = selectedFile ? { name: selectedFile.name, size: selectedFile.size } : savedFileMeta;
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ poNumber, fileMeta: meta }));
      } catch {}
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [poNumber, selectedFile, savedFileMeta, PERSIST_KEY]);

  // --- Guardar también en unmount
  React.useEffect(() => {
    return () => {
      const meta = selectedFile ? { name: selectedFile.name, size: selectedFile.size } : savedFileMeta;
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify({ poNumber, fileMeta: meta }));
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDraft = React.useCallback(() => {
    try { localStorage.removeItem(PERSIST_KEY); } catch {}
    setSavedFileMeta(null);
    setSelectedFile(null);
    setPoNumber("");
  }, [PERSIST_KEY]);

  // Limpiar el objeto File al cerrar el diálogo, pero mantener la metadata y el PO Number
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleFileChange = (fileList: FileList | null) => {
    const f = fileList && fileList.length > 0 ? fileList[0] : null;
    setSelectedFile(f);
    // Actualizar la metadata guardada inmediatamente para el autosave
    setSavedFileMeta(f ? { name: f.name, size: f.size } : null);
  };

  const handleSubmit = async () => {
    const isPoUpload = fileType === "po";
    const isQuoteUpload = fileType === "quote";
    const isSlipUpload = fileType === "slip";

    // Si el archivo es obligatorio y no está en la sesión actual (selectedFile),
    // el usuario debe volver a seleccionarlo.
    if ((isQuoteUpload || isSlipUpload) && !selectedFile) {
        // Si hay metadata guardada, significa que el archivo se perdió por recarga.
        if (savedFileMeta) {
            toast.error("Archivo perdido", { description: `El archivo ${savedFileMeta.name} se perdió. Por favor, vuelve a seleccionarlo.` });
        } else {
            toast.error("Archivo obligatorio", { description: "Debes seleccionar un archivo para continuar." });
        }
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
    (fileType === "po" && !selectedFile && !poNumber.trim());

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

  // Determinar qué metadata mostrar: el archivo seleccionado (si existe) o la metadata guardada
  const fileMetaToDisplay = selectedFile ? { name: selectedFile.name, size: selectedFile.size } : savedFileMeta;
  
  // Mostrar advertencia si se perdió el archivo pero se recuperó la metadata
  const showFileLostWarning = fileMetaToDisplay && !selectedFile && (fileType === "quote" || fileType === "slip");


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Mantén el contenido montado incluso cuando esté cerrado */}
      <DialogContent 
        className="sm:max-w-[425px]" 
        forceMount
        // CRÍTICO: Prevenir el cierre al hacer clic fuera
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

        {showFileLostWarning && (
          <div className="flex items-start gap-2 rounded-md border p-3 text-sm text-orange-600 bg-orange-50/50">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Advertencia: El archivo <strong>{fileMetaToDisplay!.name}</strong> se perdió debido a la recarga del navegador. Por favor, **vuelve a seleccionarlo** para adjuntarlo.
            </div>
          </div>
        )}

        <div className="grid gap-4 py-4">
          {fileType === "po" && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="poNumber" className="text-right">
                Número de PO <span className="text-red-500">*</span>
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