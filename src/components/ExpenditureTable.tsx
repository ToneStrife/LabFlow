"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Expenditure, Project, Vendor, SupabaseRequest } from "@/data/types";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useVendors } from "@/hooks/use-vendors"; // Importar useVendors
import { useRequests } from "@/hooks/use-requests"; // Importar useRequests

interface ExpenditureTableProps {
  expenditures: Expenditure[];
  projects: Project[] | undefined;
  onEdit: (expenditure: Expenditure) => void;
  onDelete: (expenditureId: string) => void;
}

const ExpenditureTable: React.FC<ExpenditureTableProps> = ({ expenditures, projects, onEdit, onDelete }) => {
  const { data: vendors } = useVendors();
  const { data: requests } = useRequests();
  
  const getProjectCode = (projectId: string) => {
    return projects?.find(p => p.id === projectId)?.code || "N/A";
  };
  
  const getRequestDetails = (requestId: string | null) => {
    if (!requestId) return { display: "N/A", vendorName: "N/A" };
    
    const request = requests?.find(r => r.id === requestId);
    if (!request) return { display: "Solicitud no encontrada", vendorName: "N/A" };
    
    const vendor = vendors?.find(v => v.id === request.vendor_id);
    const vendorName = vendor?.name || "Proveedor Desconocido";
    const requestNumber = request.request_number || request.id.substring(0, 8);
    
    return { 
      display: (
        <Link to={`/requests/${requestId}`} className="text-blue-500 hover:underline font-medium">
          {requestNumber}
        </Link>
      ), 
      vendorName 
    };
  };
  
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[150px]">Proyecto</TableHead>
            <TableHead className="min-w-[150px]">Proveedor</TableHead> {/* Nueva columna */}
            <TableHead className="min-w-[250px]">Descripción / Concepto</TableHead>
            <TableHead className="text-right min-w-[100px]">Monto</TableHead>
            <TableHead className="min-w-[120px]">Solicitud Vinculada</TableHead>
            <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenditures.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No se encontraron gastos registrados.
              </TableCell>
            </TableRow>
          ) : (
            expenditures.map((exp) => {
              const { display: requestDisplay, vendorName } = getRequestDetails(exp.request_id);
              
              // Si está vinculado a una solicitud, usamos el nombre del proveedor de la solicitud.
              // Si no está vinculado, mostramos N/A.
              const finalVendorName = exp.request_id ? vendorName : "N/A";

              return (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{format(new Date(exp.date_incurred), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>{getProjectCode(exp.project_id)}</TableCell>
                  <TableCell>{finalVendorName}</TableCell> {/* Mostrar nombre del proveedor */}
                  <TableCell>{exp.description}</TableCell>
                  <TableCell className="text-right font-semibold text-red-600">€{exp.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {requestDisplay}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(exp)}
                      className="mr-2"
                      title="Editar Gasto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => onDelete(exp.id)}
                      title="Eliminar Gasto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExpenditureTable;