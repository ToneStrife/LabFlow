"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Expenditure, Project } from '@/data/types';
import { format, isValid } from 'date-fns'; // Importar isValid

interface ExpenditureTableProps {
  expenditures: Expenditure[];
  projects: Project[] | undefined;
  onEdit: (expenditure: Expenditure) => void;
  onDelete: (id: string) => void;
}

const ExpenditureTable: React.FC<ExpenditureTableProps> = ({ expenditures, projects, onEdit, onDelete }) => {
  
  const getProjectCode = (projectId: string | null) => {
    if (!projectId) return 'N/A';
    return projects?.find(p => p.id === projectId)?.code || 'Desconocido';
  };

  return (
    <div className="border rounded-lg shadow-sm">
      {/* Contenedor para desplazamiento horizontal en móviles */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Fecha</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Solicitud ID</TableHead>
              <TableHead className="text-right">Monto (€)</TableHead>
              <TableHead className="text-center w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenditures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay gastos registrados.
                </TableCell>
              </TableRow>
            ) : (
              expenditures.map((expenditure) => {
                const dateObj = new Date(expenditure.date_incurred); // Corregido: usar date_incurred
                const formattedDate = isValid(dateObj) 
                  ? format(dateObj, 'dd/MM/yyyy') 
                  : 'Fecha Inválida';

                return (
                  <TableRow key={expenditure.id}>
                    <TableCell className="font-medium">
                      {formattedDate}
                    </TableCell>
                    <TableCell>{getProjectCode(expenditure.project_id)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expenditure.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {expenditure.request_id ? expenditure.request_id.substring(0, 8) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-600">
                      {expenditure.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEdit(expenditure)}
                          aria-label="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onDelete(expenditure.id)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ExpenditureTable;