"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Paperclip, PlusCircle } from "lucide-react";
import { usePackingSlips } from "@/hooks/use-packing-slips";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { toast } from "sonner";
import { format } from "date-fns";

interface PackingSlipsListProps {
  requestId: string;
  onUploadClick: () => void; // Para abrir el diálogo de subida de albarán (ahora es el diálogo de recepción)
}

// Función auxiliar para obtener el nombre de archivo legible (copiada de RequestFilesCard.tsx)
const getFileNameFromPath = (filePath: string): string => {
  if (!filePath) return "Archivo";
  try {
    const pathParts = filePath.split('/');
    const encodedFileName = pathParts[pathParts.length - 1];
    const decodedFileName = decodeURIComponent(encodedFileName);
    const parts = decodedFileName.split('_');
    if (parts.length > 1 && !isNaN(Number(parts[0]))) {
      return parts.slice(1).join('_');
    }
    return decodedFileName.substring(decodedFileName.indexOf('_') + 1) || decodedFileName || "Archivo";
  } catch (e) {
    return "Archivo";
  }
};

const PackingSlipsList: React.FC<PackingSlipsListProps> = ({ requestId, onUploadClick }) => {
  const { data: slips, isLoading, error } = usePackingSlips(requestId);
  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);

  const handleViewClick = async (filePath: string) => {
    setIsGenerating(filePath);
    
    const signedUrl = await generateSignedUrl(filePath);
    setIsGenerating(null);

    if (signedUrl) {
      window.open(signedUrl, '_blank');
    } else {
      toast.error("No se pudo generar la URL firmada para el albarán.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Albaranes de Recepción</CardTitle></CardHeader>
        <CardContent className="flex justify-center items-center h-20">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando albaranes...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error al cargar albaranes: {error.message}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Albaranes de Recepción ({slips?.length || 0})</CardTitle>
        <Button variant="outline" size="sm" onClick={onUploadClick}>
          <PlusCircle className="h-4 w-4 mr-2" /> Registrar Albarán
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {slips && slips.length > 0 ? (
          <div className="divide-y">
            {slips.map((slip) => (
              <div key={slip.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">
                    {slip.slip_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recibido el {format(new Date(slip.received_at), 'yyyy-MM-dd')}
                  </span>
                </div>
                
                {slip.slip_url ? (
                  <Button 
                    variant="link" 
                    size="sm" 
                    onClick={() => handleViewClick(slip.slip_url!)} 
                    disabled={isGenerating === slip.slip_url}
                    className="text-xs text-blue-600 hover:underline flex items-center p-0 h-auto truncate max-w-[150px] sm:max-w-[200px]"
                    title={getFileNameFromPath(slip.slip_url)}
                  >
                    {isGenerating === slip.slip_url ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Paperclip className="h-4 w-4 mr-1 flex-shrink-0" />
                    )}
                    <span className="truncate">{getFileNameFromPath(slip.slip_url)}</span>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin Archivo</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4 text-sm">
            No hay albaranes registrados para esta solicitud.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PackingSlipsList;