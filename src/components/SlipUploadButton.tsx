"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText } from "lucide-react";
import { useUploadAndCreateSlip } from "@/hooks/use-packing-slips";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

interface SlipUploadButtonProps {
  requestId: string;
}

const SlipUploadButton: React.FC<SlipUploadButtonProps> = ({ requestId }) => {
  const uploadMutation = useUploadAndCreateSlip();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [slipNumber, setSlipNumber] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
        // Intentar pre-llenar el número de albarán con el nombre del archivo
        const fileName = file.name.split('.').slice(0, -1).join('.');
        setSlipNumber(fileName);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selección requerida", { description: "Por favor, selecciona un archivo de albarán." });
      return;
    }
    
    await uploadMutation.mutateAsync({
      requestId,
      file: selectedFile,
      slipNumber: slipNumber || undefined,
    });
    
    // Limpiar estado después de la subida
    setSelectedFile(null);
    setSlipNumber('');
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    setIsDialogOpen(false);
  };

  const isSubmitting = uploadMutation.isPending;
  const isUploadDisabled = isSubmitting || !selectedFile;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" /> Subir Albarán
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Subir Archivo de Albarán</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="slipNumber">Número de Albarán (Opcional)</Label>
            <Input
              id="slipNumber"
              value={slipNumber}
              onChange={(e) => setSlipNumber(e.target.value)}
              placeholder="ej. SLIP-12345"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Archivo de Albarán (PDF, JPG, PNG)</Label>
            <div 
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="hidden"
                />
                {selectedFile ? (
                    <div className="flex items-center space-x-2 text-sm font-medium">
                        <FileText className="h-4 w-4" />
                        <span className="truncate max-w-[250px]">{selectedFile.name}</span>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">Haz clic para seleccionar archivo</p>
                )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={isUploadDisabled}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...
              </>
            ) : (
              "Subir Albarán"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SlipUploadButton;