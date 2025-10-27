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
import { Loader2 } from "lucide-react";
import { FileType } from "@/hooks/use-requests";
import { toast } from "sonner";

interface FileUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File | null, poNumber?: string) => Promise<void>; // Aceptar File | null
  isUploading: boolean;
  fileType: FileType;
}

const FileUploadDialog: React.FC<FileUploadDialogProps> = ({
  isOpen,
  onOpenChange,
  onUpload,
  isUploading,
  fileType,
}) => {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [poNumber, setPoNumber] = React.useState<string>("");

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPoNumber("");
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async () => {
    const isPoUpload = fileType === 'po';
    
    if (isPoUpload) {
      if (!poNumber.trim()) {
        toast.error("El número de PO es obligatorio.", { description: "Por favor, introduce un número de Orden de Compra." });
        return;
      }
      // Si es PO, enviamos el archivo (puede ser null) y el número de PO (obligatorio)
      await onUpload(selectedFile, poNumber.trim());
    } else if (selectedFile) {
      // Si no es PO, el archivo es obligatorio
      await onUpload(selectedFile);
    } else {
      toast.error("El archivo es obligatorio.", { description: "Por favor, selecciona un archivo para subir." });
      return;
    }
  };

  const getTitle = () => {
    switch (fileType) {
      case "quote": return "Subir Archivo de Cotización (Obligatorio)";
      case "po": return "Subir Archivo de Orden de Compra (Opcional)";
      case "slip": return "Subir Albarán (Opcional)";
      default: return "Subir Archivo";
    }
  };
  
  const isSubmitDisabled = isUploading || (fileType !== 'po' && fileType !== 'slip' && !selectedFile);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Selecciona un archivo para subir.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* PO Number is only relevant when uploading the PO file */}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="file" className="text-right">
              Archivo {fileType === 'po' || fileType === 'slip' ? "(Opcional)" : "(Obligatorio)"}
            </Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={isUploading}
            />
          </div>
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
            ) : (
              fileType === 'po' ? "Guardar Detalles de PO" : "Subir"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FileUploadDialog;