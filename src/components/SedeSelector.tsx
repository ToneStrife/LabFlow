import React from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SedeDot from "@/components/SedeDot";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { useLabsCatalog } from "@/components/LabsCatalogProvider";
import { getSedeById, getSedeLabel, SEDES_FALLBACK } from "@/lib/sedes";

const SedeSelector: React.FC = () => {
  const { sedeActiva, setSedeActiva, puedeVerTodas } = useSedeActiva();
  const { sedes: catalogo, labs } = useLabsCatalog();
  const sedes = catalogo.length ? catalogo : SEDES_FALLBACK;
  const sedeActual = sedeActiva ? getSedeById(sedeActiva) : null;
  const etiqueta = sedeActiva ? getSedeLabel(sedeActiva) : "Todas";

  const porLab = React.useMemo(() => {
    const groups: Array<{ labId: string | null; labName: string; sedes: typeof sedes }> = [];
    const byLab = new Map<string, typeof sedes>();
    for (const sede of sedes) {
      const key = sede.lab_id ?? "_";
      if (!byLab.has(key)) byLab.set(key, []);
      byLab.get(key)!.push(sede);
    }
    for (const lab of labs) {
      const list = byLab.get(lab.id);
      if (list?.length) groups.push({ labId: lab.id, labName: lab.name, sedes: list });
      byLab.delete(lab.id);
    }
    for (const [key, list] of byLab) {
      groups.push({
        labId: key === "_" ? null : key,
        labName: key === "_" ? "Sedes" : key,
        sedes: list,
      });
    }
    return groups;
  }, [sedes, labs]);

  const mostrarGrupos = porLab.length > 1;

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
      <DropdownMenuContent align="end" className="w-52">
        {puedeVerTodas && (
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
        )}
        {porLab.map((grupo, idx) => (
          <React.Fragment key={grupo.labId ?? `g-${idx}`}>
            {(mostrarGrupos || puedeVerTodas || idx > 0) && (
              <>
                {(idx > 0 || puedeVerTodas) && <DropdownMenuSeparator />}
                {mostrarGrupos && (
                  <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                    {grupo.labName}
                  </DropdownMenuLabel>
                )}
              </>
            )}
            {grupo.sedes.map((sede) => (
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
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SedeSelector;
