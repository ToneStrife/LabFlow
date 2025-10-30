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
import { Expenditure, Project } from "@/data/types";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface ExpenditureTableProps {
  expenditures: Expenditure[];
  projects: Project[] | undefined;
  onEdit: (expenditure: Expenditure) => void;
  onDelete: (expenditureId: string) => void;
}

const ExpenditureTable: React.FC<ExpenditureTableProps> = ({ expenditures, projects, onEdit, onDelete }) => {
  
  const getProjectCode = (projectId: string) => {
    return projects?.find(p => p.id === projectId)?.code || "N/A";
  };
  
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[100px]">Fecha</TableHead>
            <TableHead className="min-w-[150px]">Proyecto</TableHead>
            <TableHead className="min-w-[250px]">Descripción</TableHead>
            <TableHead className="text-right min-w-[100px]">Monto</TableHead>
            <TableHead className="min-w-[120px]">Solicitud Vinculada</TableHead>
            <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenditures.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No se encontraron gastos registrados.
              </TableCell>
            </TableRow>
          ) : (
            expenditures.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium">{format(new Date(exp.date_incurred), 'yyyy-MM-dd')}</TableCell>
                <TableCell>{getProjectCode(exp.project_id)}</TableCell>
                <TableCell>{exp.description}</TableCell>
                <TableCell className="text-right font-semibold text-red-600">€{exp.amount.toFixed(2)}</TableCell>
                <TableCell>
                  {exp.request_id ? (
                    <Link to={`/requests/${exp.request_id}`} className="text-blue-500 hover:underline">
                      Ver Solicitud
                    </Link>
                  ) : (
                    "N/A"
                  )}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExpenditureTable;