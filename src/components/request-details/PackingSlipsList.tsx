"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Paperclip, PlusCircle, Trash2, Edit, RotateCcw, List, CheckSquare } from "lucide-react";
import { usePackingSlips, useDeleteSlip, useReceivedItemsBySlip } from "@/hooks/use-packing-slips";
import { generateSignedUrl } from "@/utils/supabase-storage";
import { toast } from "sonner";
import { format } from "date-fns";
import SlipUploadButton from "../SlipUploadButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRevertRequestReception, useRequests, SupabaseRequest } from "@/hooks/use-requests";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import EditReceivedItemDialog from "./EditReceivedItemDialog"; // Importar el nuevo componente

interface PackingSlipsListProps {
  requestId: string;
  onOpenReceiveItemsDialog: () => void;
  requestNumber: string;
}

// Función auxiliar para obtener el nombre de archivo legible
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

// Componente para mostrar los ítems de un albarán
const SlipItemsDialog: React.FC<{ slipId: string; slipNumber: string; requestId: string; isOpen: boolean; onOpenChange: (open: boolean) => void }> = ({ slipId, slipNumber, requestId, isOpen, onOpenChange }) => {
    const { data: receivedItems, isLoading } = useReceivedItemsBySlip(slipId);
    const [isEditItemDialogOpen, setIsEditItemDialogOpen] = React.useState(false);
    const [editingItemData, setEditingItemData] = React.useState<any>(null);
    
    const handleEditItem = (item: any) => {
        setEditingItemData({
            receivedItemId: item.id,
            productName: item.request_item.product_name,
            quantityOrdered: item.request_item.quantity,
            oldQuantity: item.quantity_received,
            requestId: requestId, // Pasar el requestId
        });
        setIsEditItemDialogOpen(true);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Artículos del Albarán {slipNumber}</DialogTitle>
                        <DialogDescription>
                            Detalles de los artículos registrados en este albarán.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[400px] overflow-y-auto space-y-3">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-20"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : (
                            receivedItems?.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 border rounded-md">
                                    <div className="flex flex-col">
                                        <span className="font-medium">{item.request_item.product_name}</span>
                                        <span className="text-sm text-muted-foreground">Pedido: {item.request_item.quantity}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-lg text-primary">{item.quantity_received} uds.</span>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => handleEditItem(item)}
                                            title="Corregir cantidad recibida"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <EditReceivedItemDialog
                isOpen={isEditItemDialogOpen}
                onOpenChange={setIsEditItemDialogOpen}
                itemData={editingItemData}
            />
        </>
    );
};


const PackingSlipsList: React.FC<PackingSlipsListProps> = ({ requestId, requestNumber }) => {
  const { data: slips, isLoading, error } = usePackingSlips(requestId);
  const { data: requests } = useRequests();
  const request = requests?.find(req => req.id === requestId);
  
  const deleteSlipMutation = useDeleteSlip();
  const revertReceptionMutation = useRevertRequestReception();
  const queryClient = useQueryClient();

  const [isGenerating, setIsGenerating] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [slipToDelete, setSlipToDelete] = React.useState<string | null>(null);
  
  const [isEditSlipDialogOpen, setIsEditSlipDialogOpen] = React.useState(false);
  const [editingSlip, setEditingSlip] = React.useState<{ id: string; slip_number: string } | null>(null);
  const [newSlipNumber, setNewSlipNumber] = React.useState('');
  
  const [isSlipItemsDialogOpen, setIsSlipItemsDialogOpen] = React.useState(false);
  const [selectedSlipForItems, setSelectedSlipForItems] = React.useState<{ id: string; slip_number: string } | null>(null);
  
  const isRequestReceived = request?.status === 'Received';

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
  
  const handleDeleteClick = (slipId: string) => {
    setSlipToDelete(slipId);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteSlip = async () => {
    if (slipToDelete) {
        await deleteSlipMutation.mutateAsync(slipToDelete);
        setIsDeleteDialogOpen(false);
        setSlipToDelete(null);
    }
  };
  
  const handleEditSlipNumber = (slip: { id: string; slip_number: string }) => {
    setEditingSlip(slip);
    setNewSlipNumber(slip.slip_number);
    setIsEditSlipDialogOpen(true);
  };
  
  const handleSaveSlipNumber = async () => {
    if (!editingSlip || !newSlipNumber.trim()) {
        toast.error("El número de albarán no puede estar vacío.");
        return;
    }
    
    const loadingToastId = toast.loading("Actualizando número de albarán...");
    
    try {
        const { error } = await supabase
            .from('packing_slips')
            .update({ slip_number: newSlipNumber.trim() })
            .eq('id', editingSlip.id);
            
        if (error) throw new Error(error.message);
        
        // Invalida la consulta específica para que se recargue la lista
        queryClient.invalidateQueries({ queryKey: ['packingSlips', requestId] });
        toast.success("Número de albarán actualizado exitosamente!", { id: loadingToastId });
        setIsEditSlipDialogOpen(false);
        setEditingSlip(null);
    } catch (e) {
        toast.error("Fallo al actualizar el número de albarán.", { description: (e as Error).message, id: loadingToastId });
    }
  };
  
  const handleRevertReception = async () => {
    if (!request) return;
    await revertReceptionMutation.mutateAsync(request.id);
  };
  
  const handleViewSlipItems = (slip: { id: string; slip_number: string }) => {
      setSelectedSlipForItems(slip);
      setIsSlipItemsDialogOpen(true);
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
  
  // Formatear el nombre del albarán según el requisito: Solicitud Corta + Albarán + 00X
  const formatSlipName = (slipNumber: string, index: number) => {
      const shortRequest = requestNumber.split('-').pop() || requestNumber.substring(0, 4);
      const paddedIndex = String(index + 1).padStart(3, '0');
      return `${shortRequest}-${slipNumber}-${paddedIndex}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Albaranes de Recepción ({slips?.length || 0})</CardTitle>
        <div className="flex space-x-2">
            {isRequestReceived && (
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRevertReception}
                    disabled={revertReceptionMutation.isPending}
                    title="Revertir la recepción completa de esta solicitud"
                >
                    {revertReceptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Revertir Recepción
                </Button>
            )}
            <SlipUploadButton requestId={requestId} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {slips && slips.length > 0 ? (
          <div className="divide-y">
            {slips.map((slip, index) => (
              <div key={slip.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate" title={slip.slip_number}>
                    {formatSlipName(slip.slip_number, index)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recibido el {format(new Date(slip.received_at), 'yyyy-MM-dd')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                    {/* Botón de Ver Ítems */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewSlipItems(slip)}
                        title="Ver Artículos Recibidos"
                        disabled={deleteSlipMutation.isPending || revertReceptionMutation.isPending}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    
                    {/* Botón de Edición de Número */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSlipNumber(slip)}
                        title="Editar Número de Albarán"
                        disabled={deleteSlipMutation.isPending || revertReceptionMutation.isPending}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    
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
                    
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteClick(slip.id)}
                        title="Eliminar Albarán"
                        disabled={deleteSlipMutation.isPending || revertReceptionMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-4 text-sm">
            No hay albaranes registrados para esta solicitud.
          </div>
        )}
      </CardContent>
      
      {/* Diálogo de Confirmación de Eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Eliminar Albarán</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este albarán? Si la solicitud está en estado "Recibido" y tiene artículos asociados, debes usar la opción de Revertir Recepción. De lo contrario, se eliminará el registro.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteSlipMutation.isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSlip} disabled={deleteSlipMutation.isPending}>
              {deleteSlipMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Edición de Número de Albarán */}
      <Dialog open={isEditSlipDialogOpen} onOpenChange={setIsEditSlipDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Número de Albarán</DialogTitle>
            <DialogDescription>
              Actualiza el número de albarán para el registro seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="newSlipNumber">Número de Albarán</Label>
            <Input
              id="newSlipNumber"
              value={newSlipNumber}
              onChange={(e) => setNewSlipNumber(e.target.value)}
              disabled={deleteSlipMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSlipDialogOpen(false)} disabled={deleteSlipMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSlipNumber} disabled={deleteSlipMutation.isPending || !newSlipNumber.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de Ítems del Albarán (para corrección) */}
      {selectedSlipForItems && (
          <SlipItemsDialog
              slipId={selectedSlipForItems.id}
              slipNumber={formatSlipName(selectedSlipForItems.slip_number, slips?.findIndex(s => s.id === selectedSlipForItems.id) || 0)}
              requestId={requestId} // Pasar el requestId
              isOpen={isSlipItemsDialogOpen}
              onOpenChange={setIsSlipItemsDialogOpen}
          />
      )}
    </Card>
  );
};

export default PackingSlipsList;