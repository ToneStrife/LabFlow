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
  // opcional: una clave estable para aislar el borrador (p.ej., requestId)
  draftKey?: string;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  onUpload,
  isUploading,
  fileType,
  draftKey = "global",
}) => {
  // --- Persistencia: claves por usuario/solicitud/diálogo si quieres afinar más
  const PERSIST_KEY = React.useMemo(
    () => `uploadDialog:${fileType}:${draftKey}`,
    [fileType, draftKey]
  );

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [poNumber, setPoNumber] = React.useState<string>("");

  // guardamos metadatos no sensibles del archivo para informar al reabrir
  const [savedFileMeta, setSavedFileMeta] = React.useState<
    { name: string; size: number } | null
  >(null);

  // ---- Restore al abrir (y también en primer render si ya estaba abierto)
  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved) {
        setPoNumber(saved.poNumber ?? "");
        setSavedFileMeta(saved.fileMeta ?? null);
        // No podemos restaurar el File. Mostramos aviso si había fileMeta.
        setSelectedFile(null);
      }
    } catch {}
  }, [isOpen, PERSIST_KEY]);

  // ---- Autosave con debounce
  React.useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      const meta = selectedFile
        ? { name: selectedFile.name, size: selectedFile.size }
        : savedFileMeta; // si no hay archivo seleccionado, preserva el último meta
      const toSave = {
        poNumber,
        fileMeta: meta,
      };
      try {
        localStorage.setItem(PERSIST_KEY, JSON.stringify(toSave));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [isOpen, poNumber, selectedFile, savedFileMeta, PERSIST_KEY]);

  // Guardado inmediato al ocultar pestaña
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden" || !isOpen) return;
      try {
        const meta = selectedFile
          ? { name: selectedFile.name, size: selectedFile.size }
          : savedFileMeta;
        localStorage.setItem(
          PERSIST_KEY,
          JSON.stringify({ poNumber, fileMeta: meta })
        );
      } catch {}
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [isOpen, poNumber, selectedFile, savedFileMeta, PERSIST_KEY]);

  const clearDraft = React.useCallback(() => {
    try {
      localStorage.removeItem(PERSIST_KEY);
    } catch {}
    setSavedFileMeta(null);
  }, [PERSIST_KEY]);

  // Reset limpio al cerrar manualmente
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPoNumber("");
      // OJO: no borro el draft aquí para permitir que reabra y recupere.
      // Si prefieres borrar al cerrar, descomenta:
      // clearDraft();
    }
  }, [isOpen /* , clearDraft */]);

  const handleFileChange = (fileList: FileList | null) => {
    const f = fileList && fileList.length > 0 ? fileList[0] : null;
    setSelectedFile(f);
    setSavedFileMeta(f ? { name: f.name, size: f.size } : null);
  };

  const handleSubmit = async () => {
    const isPoUpload = fileType === "po";
    const isQuoteUpload = fileType === "quote";
    const isSlipUpload = fileType === "slip";

    if (isPoUpload) {
      if (!poNumber.trim() && !selectedFile) {
        toast.error("Faltan datos", {
          description: "Indica un número de PO y/o selecciona un archivo.",
        });
        return;
      }
      await onUpload(selectedFile, poNumber.trim() || undefined);
    } else if (isQuoteUpload) {
      if (!selectedFile) {
        toast.error("El archivo de cotización es obligatorio.", {
          description: "Por favor, selecciona un archivo para subir.",
        });
        return;
      }
      await onUpload(selectedFile);
    } else if (isSlipUpload) {
      await onUpload(selectedFile);
    }

    // Al subir OK, limpiamos el borrador y cerramos
    clearDraft();
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (fileType) {
      case "quote":
        return "Subir Archivo de Cotización";
      case "po":
        return "Subir Archivo de Orden de Compra";
      case "slip":
        return "Subir Albarán";
      default:
        return "Subir Archivo";
    }
  };

  const getFileLabel = () => {
    if (fileType === "quote") return "Archivo de Cotización (Obligatorio)";
    if (fileType === "po") return "Archivo de PO (Opcional)";
    if (fileType === "slip") return "Archivo de Albarán (Opcional)";
    return "Archivo";
  };

  const isSubmitDisabled =
    isUploading ||
    (fileType === "quote" && !selectedFile) ||
    (fileType === "slip" && !selectedFile) ||
    (fileType === "po" && !selectedFile && !poNumber.trim());

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {fileType === "po"
              ? "Introduce el número de PO y/o sube el archivo."
              : "Selecciona un archivo para subir."}
          </DialogDescription>
        </DialogHeader>

        {/* aviso si había fichero en borrador pero no puede restaurarse */}
        {savedFileMeta && !selectedFile && (
          <div className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              Tenías un archivo pendiente: <strong>{savedFileMeta.name}</strong>{" "}
              ({Math.round(savedFileMeta.size / 1024)} KB). Por seguridad del
              navegador, debes volver a seleccionarlo.
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
            currentFile={selectedFile}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
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
