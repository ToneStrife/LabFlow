"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Paperclip, Loader2, Trash2 } from "lucide-react";
import { SupabaseRequest } from "@/data/types"; // Corrected import
import { FileType } from "@/hooks/use-requests";
import { generateSignedUrl } from "@/utils/supabase-storage"; // Importar utilidad
import { toast } from "sonner";

interface RequestFilesCardProps {
  request: SupabaseRequest;
  onUploadClick: (fileType: FileType) => void;
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

const FileRow: React.FC<{ label: string; filePath: string | null; onUpload: () => void }> = ({ label, filePath, onUpload }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleViewClick = async () => {
    if (!filePath) return;
    setIsGenerating(true);
    
    // No necesitamos el cacheBuster en la ruta si el nombre del archivo ya incluye un timestamp único.
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(false);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast.error("No se pudo generar la URL firmada. Verifica que el archivo exista y que tu sesión esté activa.");
    }
  };

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
              disabled={isGenerating}
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
            <Button variant="outline" size="icon" onClick={onUpload} title="Reemplazar Archivo" className="h-8 w-8 flex-shrink-0">
              <Upload className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onUpload} title="Subir Archivo" className="h-8 px-3 text-sm">
            <Upload className="h-4 w-4 mr-2" />
            Subir
          </Button>
        )}
      </div>
    </div>
  );
};

const RequestFilesCard: React.FC<RequestFilesCardProps> = ({ request, onUploadClick }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Archivos Adjuntos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <FileRow 
          label="Cotización" 
          filePath={request.quote_url} 
          onUpload={() => onUploadClick("quote")} 
        />
        <FileRow 
          label="Orden de Compra (PO)" 
          filePath={request.po_url} 
          onUpload={() => onUploadClick("po")} 
        />
        <FileRow 
          label="Último Albarán" 
          filePath={request.slip_url} 
          onUpload={() => onUploadClick("slip")} 
        />
      </CardContent>
    </Card>
  );
};

export default RequestFilesCard;