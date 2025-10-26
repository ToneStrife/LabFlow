"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Paperclip, Loader2 } from "lucide-react";
import { SupabaseRequest } from "@/hooks/use-requests";
import { FileType } from "@/hooks/use-requests";
import { generateSignedUrl } from "@/utils/supabase-storage"; // Importar utilidad

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
    
    // 2. Intentar eliminar el prefijo de timestamp (ej. 2024-001-Quote-1721937600000.pdf)
    // El formato es: [RequestNumber]-[FileType]-[Timestamp].[ext]
    // Buscamos el último guion (-) que precede a un número largo (timestamp)
    
    const parts = decodedFileName.split('-');
    if (parts.length >= 3) {
      const timestampPart = parts[parts.length - 1];
      // Si la última parte contiene un punto (extensión) y la penúltima es un número largo (timestamp)
      if (timestampPart.includes('.') && !isNaN(Number(parts[parts.length - 2]))) {
        // Reconstruir el nombre sin el timestamp y la extensión
        const extension = timestampPart.split('.').pop();
        const nameWithoutTimestamp = parts.slice(0, parts.length - 2).join('-');
        
        // El nombre legible es [RequestNumber]-[FileType].[ext]
        return `${nameWithoutTimestamp}.${extension}`;
      }
    }
    
    // Fallback si el formato no coincide o si es el formato antiguo
    return decodedFileName.substring(decodedFileName.indexOf('_') + 1) || decodedFileName || "File";
  } catch (e) {
    console.error("Could not parse filename from path", e);
    return "File";
  }
};

const FileRow: React.FC<{ label: string; filePath: string | null; onUpload: () => void }> = ({ label, filePath, onUpload }) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleViewClick = async () => {
    if (!filePath) return;
    setIsGenerating(true);
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(false);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-md hover:bg-muted border-b last:border-b-0">
      <div className="flex items-center mb-2 sm:mb-0">
        <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
        {filePath ? (
          <>
            <Button 
              variant="link" 
              size="sm" 
              onClick={handleViewClick} 
              disabled={isGenerating}
              className="text-xs text-blue-600 hover:underline flex items-center p-0 h-auto"
              title={getFileNameFromPath(filePath)}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Paperclip className="h-4 w-4 mr-1" />
              )}
              <span className="truncate max-w-[150px]">{getFileNameFromPath(filePath)}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onUpload} title="Replace File" className="h-7 px-2 text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Replace
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onUpload} title="Upload File" className="h-7 px-2 text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Upload
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
        <CardTitle>Attached Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        <FileRow label="Quote" filePath={request.quote_url} onUpload={() => onUploadClick("quote")} />
        <FileRow label="Purchase Order" filePath={request.po_url} onUpload={() => onUploadClick("po")} />
        <FileRow label="Packing Slip" filePath={request.slip_url} onUpload={() => onUploadClick("slip")} />
      </CardContent>
    </Card>
  );
};

export default RequestFilesCard;