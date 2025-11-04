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
import FileUploadInput from "../FileUploadInput"; // Importar el nuevo componente

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

  const handleFileChange = (fileList: FileList | null) => {
    setSelectedFile(fileList && fileList.length > 0 ? fileList[0] : null);
  };

  const handleSubmit = async () => {
    const isPoUpload = fileType === 'po';
    const isQuoteUpload = fileType === 'quote';
    
    if (isPoUpload) {
      if (!poNumber.trim()) {
        toast.error("El número de PO es obligatorio.", { description: "Por favor, introduce un número de Orden de Compra." });
        return;
      }
      // Si es PO, el archivo es opcional, pero el número de PO es obligatorio.
      await onUpload(selectedFile, poNumber.trim());
    } else if (isQuoteUpload) {
      // Si es Quote, el archivo es obligatorio.
      if (!selectedFile) {
        toast.error("El archivo de cotización es obligatorio.", { description: "Por favor, selecciona un archivo para subir." });
        return;
      }
      await onUpload(selectedFile);
    } else if (fileType === 'slip') {
      // Si es Slip, el archivo es opcional.
      await onUpload(selectedFile);
    }
    
    // Si es un PO sin archivo, solo se guarda el número de PO.
    if (isPoUpload && !selectedFile && poNumber.trim()) {
        await onUpload(null, poNumber.trim());
    }
  };

  const getTitle = () => {
    switch (fileType) {
      case "quote": return "Subir Archivo de Cotización";
      case "po": return "Subir Archivo de Orden de Compra";
      case "slip": return "Subir Albarán";
      default: return "Subir Archivo";
    }
  };
  
  const getFileLabel = () => {
    if (fileType === 'quote') return "Archivo de Cotización (Obligatorio)";
    if (fileType === 'po') return "Archivo de PO (Opcional)";
    if (fileType === 'slip') return "Archivo de Albarán (Opcional)";
    return "Archivo";
  };
  
  // La lógica de deshabilitación es más compleja ahora:
  // 1. Siempre deshabilitado si está subiendo.
  // 2. Si es 'quote', requiere archivo.
  // 3. Si es 'po', requiere archivo O número de PO.
  // 4. Si es 'slip', requiere archivo.
  const isSubmitDisabled = isUploading || 
    (fileType === 'quote' && !selectedFile) ||
    (fileType === 'slip' && !selectedFile) ||
    (fileType === 'po' && !selectedFile && !poNumber.trim());


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            {fileType === 'po' ? "Introduce el número de PO y/o sube el archivo." : "Selecciona un archivo para subir."}
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