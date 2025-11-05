"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Paperclip, Loader2, Trash2 } from "lucide-react";
import { SupabaseRequest } from "@/data/types"; // Corrected import
import { FileType, useUpdateRequestFile } from "@/hooks/use-requests"; // Importar useUpdateRequestFile
import { generateSignedUrl } from "@/utils/supabase-storage"; // Importar utilidad
import { toast } from "sonner";

interface RequestFilesCardProps {
  request: SupabaseRequest;
  onUploadClick: (fileType: FileType) => void; // Mantener para quote/po
  onSimpleFileUpload: (file: File, fileType: FileType) => Promise<void>; // Nuevo prop para subida simple
}

const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "File";
  try {
    // 1. Obtener el nombre de archivo codificado (última parte de la ruta)
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    
    // 2. Eliminar el prefijo de timestamp (ej. 1721937600000_my_file.pdf)
    const parts = decodedFileName.split('_');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      // Si la primera parte es un número (timestamp), devolver el resto
      return parts.slice(1).join('_');
    }
    
    // Fallback si el formato no coincide o si es el formato antiguo
    return decodedFileName.substring(decodedFileName.indexOf('_') + 1) || decodedFileName || "Archivo";
  } catch (e) {
    console.error("Could not parse filename from path", e);
    return "Archivo";
  }
};

interface FileRowProps {
    label: string;
    filePath: string | null;
    fileType: FileType;
    onUploadClick: () => void; // Para abrir diálogo (quote/po)
    onSimpleFileUpload: (file: File) => Promise<void>; // Para subida directa (slip)
}

const FileRow: React.FC<FileRowProps> = ({ label, filePath, fileType, onUploadClick, onSimpleFileUpload }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleViewClick = async () => {
    if (!filePath) return;
    setIsGenerating(true);
    
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(false);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast.error(`No se pudo generar la URL firmada para ${label}.`);
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setIsUploading(true);
        try {
            await onSimpleFileUpload(file);
        } catch (e) {
            // El error ya se maneja en el hook de mutación
        } finally {
            setIsUploading(false);
            // Limpiar el input para permitir la subida del mismo archivo de nuevo
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    }
  };
  
  // Si es 'slip', usamos la subida directa. Si es 'quote' o 'po', usamos el diálogo.
  const isSimpleUpload = fileType === 'slip';
  const actionHandler = isSimpleUpload ? () => inputRef.current?.click() : onUploadClick;
  const buttonDisabled = isGenerating || isUploading;

  return (
    <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border-b last:border-b-0">
      <div className="flex items-center min-w-0 flex-shrink-0">
        <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
        <span className="font-medium text-sm">{label}</span>
      </div>
      
      <div className="flex items-center space-x-2 min-w-0 flex-grow justify-end">
        {filePath ? (
          <>
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleViewClick} 
              disabled={buttonDisabled}
              className="text-xs text-blue-600 hover:underline flex items-center p-0 h-auto truncate max-w-[150px] sm:max-w-[200px]"
              title={getFileNameFromPath(filePath)}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Paperclip className="h-4 w-4 mr-1 flex-shrink-0" />
              )}
              <span className="truncate">{getFileNameFromPath(filePath)}</span>
            </Button>
            
            {/* Botón de Reemplazar/Subir como icono */}
            <Button variant="outline" size="icon" onClick={actionHandler} title="Reemplazar Archivo" className="h-8 w-8 flex-shrink-0" disabled={buttonDisabled}>
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={actionHandler} title="Subir Archivo" className="h-8 px-3 text-sm" disabled={buttonDisabled}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Subir
          </Button>
        )}
        
        {/* Input de archivo oculto para subida simple */}
        {isSimpleUpload && (
            <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                disabled={buttonDisabled}
                className="hidden"
                max={1}
            />
        )}
      </div>
    </div>
  );
};

const RequestFilesCard: React.FC<RequestFilesCardProps> = ({ request, onUploadClick, onSimpleFileUpload }) => {
  
  // La subida simple de SLIP ya no se usa aquí, pero mantenemos el handler para Quote/PO si fuera necesario.
  const handleSimpleUpload = (fileType: FileType) => async (file: File) => {
      await onSimpleFileUpload(file, fileType);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Archivos Adjuntos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <FileRow 
          label="Cotización" 
          filePath={request.quote_url} 
          fileType="quote"
          onUploadClick={() => onUploadClick("quote")} 
          onSimpleFileUpload={handleSimpleUpload("quote")} // No se usa, pero se pasa
        />
        <FileRow 
          label="Orden de Compra (PO)" 
          filePath={request.po_url} 
          fileType="po"
          onUploadClick={() => onUploadClick("po")} 
          onSimpleFileUpload={handleSimpleUpload("po")} // No se usa, pero se pasa
        />
        {/* La fila de Albarán se ha movido a PackingSlipsList */}
      </CardContent>
    </Card>
  );
};

export default RequestFilesCard;