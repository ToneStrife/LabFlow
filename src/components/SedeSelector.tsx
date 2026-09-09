"use client";

import React from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SedeDot from "@/components/SedeDot";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { SEDES, getSedeById, getSedeLabel } from "@/lib/sedes";

const SedeSelector: React.FC = () => {
  const { sedeActiva, setSedeActiva } = useSedeActiva();
  const sedeActual = sedeActiva ? getSedeById(sedeActiva) : null;
  const etiqueta = sedeActiva ? getSedeLabel(sedeActiva) : "Todas";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          title="Cambiar sede"
          aria-label={`Sede: ${etiqueta}`}
        >
          {sedeActual ? (
            <SedeDot color={sedeActual.color} />
          ) : (
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="max-w-[6.5rem] truncate text-xs sm:max-w-[7.5rem] sm:text-sm">
            {etiqueta}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => setSedeActiva(null)}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Todas
          </span>
          {!sedeActiva && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
        {SEDES.map((sede) => (
          <DropdownMenuItem
            key={sede.id}
            onClick={() => setSedeActiva(sede.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <SedeDot color={sede.color} />
              {sede.name}
            </span>
            {sedeActiva === sede.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SedeSelector;
