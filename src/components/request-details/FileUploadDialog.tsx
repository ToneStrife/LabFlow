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

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [poNumber, setPoNumber] = React.useState<string>("");
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
        setSelectedFile(null); // Files no restaurables
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PERSIST_KEY]);

  // --- AUTOSAVE SIEMPRE (no depende de isOpen)
  React.useEffect(() => {
    const id = setTimeout(() => {
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

  // --- Guardar también en unmount (por si Radix desmonta igualmente)
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
  }, [PERSIST_KEY]);

  // Si cierras el diálogo NO borro el borrador (para poder recuperar si lo reabres).
  // Si quieres borrarlo al cerrar, descomenta clearDraft() aquí.
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      // setPoNumber(""); // opcional: si prefieres limpiar visualmente al cerrar
      // clearDraft();
    }
  }, [isOpen /*, clearDraft*/]);

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
        toast.error("Faltan datos", { description: "Indica un número de PO y/o selecciona un archivo." });
        return;
      }
      await onUpload(selectedFile, poNumber.trim() || undefined);
    } else if (isQuoteUpload) {
      if (!selectedFile) {
        toast.error("El archivo de cotización es obligatorio.", { description: "Selecciona un archivo para subir." });
        return;
      }
      await onUpload(selectedFile);
    } else if (isSlipUpload) {
      await onUpload(selectedFile);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Mantén el contenido montado incluso cuando esté cerrado */}
      <DialogContent className="sm:max-w-[425px]" forceMount>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {fileType === "po"
              ? "Introduce el número de PO y/o sube el archivo."
              : "Selecciona un archivo para subir."}
          </DialogDescription>
        </DialogHeader>

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
