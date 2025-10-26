"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Paperclip } from "lucide-react";
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
    // La ruta del archivo es la última parte después del request_id
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    
    // Eliminar el prefijo de timestamp (ej. "1678886400000_")
    const nameWithoutPrefix = decodedFileName.substring(decodedFileName.indexOf('_') + 1);
    return nameWithoutPrefix || decodedFileName || "File"; // Fallback si algo sale mal
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
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
      <div className="flex items-center">
        <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
        <span className="font-medium">{label}</span>
      </div>
      {filePath ? (
        <Button 
          variant="link" 
          size="sm" 
          onClick={handleViewClick} 
          disabled={isGenerating}
          className="text-sm text-blue-600 hover:underline flex items-center p-0 h-auto"
          title={getFileNameFromPath(filePath)}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Paperclip className="h-4 w-4 mr-1" />
          )}
          <span className="truncate max-w-[150px]">{getFileNameFromPath(filePath)}</span>
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onUpload}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      )}
    </div>
  );
};

const RequestFilesCard: React.FC<RequestFilesCardProps> = ({ request, onUploadClick }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attached Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <FileRow label="Quote" filePath={request.quote_url} onUpload={() => onUploadClick("quote")} />
        <FileRow label="Purchase Order" filePath={request.po_url} onUpload={() => onUploadClick("po")} />
        <FileRow label="Packing Slip" filePath={request.slip_url} onUpload={() => onUploadClick("slip")} />
      </CardContent>
    </Card>
  );
};

export default RequestFilesCard;