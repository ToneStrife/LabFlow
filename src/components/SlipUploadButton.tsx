"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useUploadAndCreateSlip } from "@/hooks/use-packing-slips";
import { toast } from "sonner";

interface SlipUploadButtonProps {
  requestId: string;
}

const SlipUploadButton: React.FC<SlipUploadButtonProps> = ({ requestId }) => {
  const uploadMutation = useUploadAndCreateSlip();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (!file) return;

    // 1. Pedir el número de albarán usando un prompt (opcional)
    const defaultSlipNumber = file.name.split('.').slice(0, -1).join('.');
    const slipNumberInput = prompt(`Introduce el número de albarán (Opcional):`, defaultSlipNumber);
    
    // Si el usuario cancela el prompt, abortamos
    if (slipNumberInput === null) {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Limpiar el input
        }
        return;
    }
    
    // 2. Subir el archivo
    await uploadMutation.mutateAsync({
      requestId,
      file: file,
      slipNumber: slipNumberInput || undefined, // undefined si está vacío
    });
    
    // 3. Limpiar el input después de la subida
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (uploadMutation.isPending) return;
    fileInputRef.current?.click();
  };

  const isSubmitting = uploadMutation.isPending;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
        disabled={isSubmitting}
        className="hidden"
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleClick}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" /> Subir Albarán
          </>
        )}
      </Button>
    </>
  );
};

export default SlipUploadButton;