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
import { Loader2, CheckCheck, DollarSign } from "lucide-react";
import { SupabaseRequest } from "@/data/types";
import { useAddExpenditure, ExpenditureFormValues } from "@/hooks/use-expenditures";
import { useProjects } from "@/hooks/use-projects";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportExpendituresDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  requests: SupabaseRequest[];
}

// Función auxiliar para calcular el costo total de una solicitud
const calculateRequestTotal = (request: SupabaseRequest): number => {
  if (!request.items) return 0;
  return request.items.reduce((total, item) => {
    const price = item.unit_price || 0;
    return total + (price * item.quantity);
  }, 0);
};

// Hook para manejar la importación masiva
const useImportRequestsAsExpenditures = () => {
  const addExpenditureMutation = useAddExpenditure();
  
  return (requestsToImport: { request: SupabaseRequest; projectId: string }[]) => {
    if (requestsToImport.length === 0) return;

    const importPromises = requestsToImport.map(({ request, projectId }) => {
      const totalAmount = calculateRequestTotal(request);
      const requestNumber = request.request_number || request.id.substring(0, 8);
      
      const expenditureData: ExpenditureFormValues = {
        project_id: projectId,
        amount: totalAmount,
        description: `Costo de la Solicitud #${requestNumber} (${request.vendor_id})`,
        date_incurred: format(new Date(), 'yyyy-MM-dd'), // Fecha de hoy
        request_id: request.id,
      };
      
      return addExpenditureMutation.mutateAsync(expenditureData);
    });
    
    return Promise.all(importPromises);
  };
};


const ImportExpendituresDialog: React.FC<ImportExpendituresDialogProps> = ({
  isOpen,
  onOpenChange,
  requests,
}) => {
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const importRequests = useImportRequestsAsExpenditures();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // Estado para almacenar el ID de proyecto seleccionado para cada solicitud
  const [projectSelections, setProjectSelections] = React.useState<Record<string, string>>({});
  
  // Inicializar selecciones de proyecto con el primer proyecto disponible o null
  React.useEffect(() => {
    if (projects && projects.length > 0) {
      const defaultProjectId = projects[0].id;
      const initialSelections: Record<string, string> = {};
      requests.forEach(req => {
        // Intentar usar el primer código de proyecto de la solicitud si existe
        const defaultReqProject = req.project_codes?.[0];
        initialSelections[req.id] = defaultReqProject || defaultProjectId;
      });
      setProjectSelections(initialSelections);
    }
  }, [requests, projects]);

  const handleProjectChange = (requestId: string, projectId: string) => {
    setProjectSelections(prev => ({ ...prev, [requestId]: projectId }));
  };
  
  const handleImport = async () => {
    if (isSubmitting) return;
    
    const requestsToImport = requests.map(request => ({
      request,
      projectId: projectSelections[request.id],
    })).filter(item => !!item.projectId); // Asegurar que se haya seleccionado un proyecto
    
    if (requestsToImport.length === 0) {
      toast.error("No hay solicitudes válidas para importar o falta asignar un proyecto.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await importRequests(requestsToImport);
      toast.success(`Importación completada. Se registraron ${requestsToImport.length} gastos.`);
      onOpenChange(false);
    } catch (e) {
      toast.error("Fallo al importar gastos.", { description: (e as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const totalImportAmount = requests.reduce((sum, req) => sum + calculateRequestTotal(req), 0);
  const isReadyToImport = requests.length > 0 && Object.keys(projectSelections).length === requests.length && Object.values(projectSelections).every(id => !!id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5" /> Importar Gastos de Solicitudes Recibidas
          </DialogTitle>
          <DialogDescription>
            Las siguientes {requests.length} solicitudes han sido recibidas pero aún no tienen un gasto asociado. Asigna un proyecto para importar el costo total de la solicitud.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[400px] overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Solicitud</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Costo Total</TableHead>
                <TableHead className="min-w-[200px]">Asignar Proyecto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const total = calculateRequestTotal(req);
                const requestNumber = req.request_number || req.id.substring(0, 8);
                
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{requestNumber}</TableCell>
                    <TableCell>{req.vendor_id}</TableCell> {/* Usar ID de vendor por simplicidad */}
                    <TableCell className="text-right font-semibold">€{total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select 
                        value={projectSelections[req.id] || ""} 
                        onValueChange={(value) => handleProjectChange(req.id, value)}
                        disabled={isLoadingProjects || isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona proyecto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects?.map((project) => (
                            <SelectItem key={project.id} value={project.id}>{project.code} - {project.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-lg font-bold">Total a Importar: <span className="text-red-600">€{totalImportAmount.toFixed(2)}</span></p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={isSubmitting || !isReadyToImport}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...
              </>
            ) : (
              <>
                <CheckCheck className="mr-2 h-4 w-4" /> Importar {requests.length} Gastos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportExpendituresDialog;