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
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { Project, Profile } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";
import { proyectoVigente } from "@/lib/projects";

interface ProjectTableProps {
  projects: Project[];
  profiles?: Profile[];
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  profiles = [],
  onEdit,
  onDelete,
}) => {
  const nombreResponsable = (ipProfileId: string | null) => {
    if (!ipProfileId) return "—";
    const perfil = profiles.find((p) => p.id === ipProfileId);
    return perfil ? getFullName(perfil) : "Usuario desconocido";
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código Proyecto</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>CIF</TableHead>
            <TableHead>Investigador responsable</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No se encontraron proyectos.
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow key={project.id} className={!proyectoVigente(project) ? "opacity-60" : undefined}>
                <TableCell className="font-medium">{project.code}</TableCell>
                <TableCell>{project.entidad || "—"}</TableCell>
                <TableCell>{project.entidad_cif || "—"}</TableCell>
                <TableCell>{nombreResponsable(project.ip_profile_id)}</TableCell>
                <TableCell>{project.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {project.activo === false ? (
                      <Badge variant="outline">Inactivo</Badge>
                    ) : proyectoVigente(project) ? (
                      <Badge variant="secondary">Activo</Badge>
                    ) : (
                      <Badge variant="outline">Fuera de fechas</Badge>
                    )}
                    {(project.fecha_inicio || project.fecha_fin) && (
                      <span className="text-xs text-muted-foreground">
                        {[project.fecha_inicio, project.fecha_fin].filter(Boolean).join(" → ")}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(project)}
                    className="mr-2"
                    title="Editar Proyecto"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => onDelete(project.id)}
                    title="Eliminar Proyecto"
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

export default ProjectTable;
