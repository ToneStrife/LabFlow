"use client";

import React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TonoEtapa = "amber" | "sky" | "indigo" | "violet" | "rose";

const TONOS: Record<TonoEtapa, { icono: string; caja: string; barra: string }> = {
  amber: { icono: "text-amber-600 dark:text-amber-400", caja: "bg-amber-100 dark:bg-amber-950", barra: "bg-amber-500" },
  sky: { icono: "text-sky-600 dark:text-sky-400", caja: "bg-sky-100 dark:bg-sky-950", barra: "bg-sky-500" },
  indigo: { icono: "text-indigo-600 dark:text-indigo-400", caja: "bg-indigo-100 dark:bg-indigo-950", barra: "bg-indigo-500" },
  violet: { icono: "text-violet-600 dark:text-violet-400", caja: "bg-violet-100 dark:bg-violet-950", barra: "bg-violet-500" },
  rose: { icono: "text-rose-600 dark:text-rose-400", caja: "bg-rose-100 dark:bg-rose-950", barra: "bg-rose-500" },
};

export interface Etapa {
  id: string;
  etiqueta: string;
  valor: string | number;
  pie: string;
  icono: LucideIcon;
  tono: TonoEtapa;
  onSelect: () => void;
}

/**
 * El panel tenia cinco tarjetas sueltas con cinco numeros. Pero esos numeros no
 * son independientes: son las fases por las que pasa una solicitud, en orden.
 * Aqui se dibujan como lo que son, un recorrido, y cada fase lleva al sitio
 * donde se actua sobre ella.
 */
export const WorkflowStrip: React.FC<{ etapas: Etapa[] }> = ({ etapas }) => (
  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <div
      className={cn(
        "grid divide-y sm:divide-x sm:divide-y-0",
        "grid-cols-1 sm:grid-cols-2",
        etapas.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"
      )}
    >
      {etapas.map((etapa, indice) => {
        const tono = TONOS[etapa.tono];
        const Icono = etapa.icono;
        const esUltima = indice === etapas.length - 1;

        return (
          <button
            key={etapa.id}
            type="button"
            onClick={etapa.onSelect}
            className={cn(
              "group relative p-4 text-left transition-colors",
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            )}
          >
            {/* Filo de color: identifica la fase sin gritar */}
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100",
                tono.barra
              )}
            />

            <div className="flex items-center gap-2">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tono.caja)}>
                <Icono className={cn("h-4 w-4", tono.icono)} />
              </span>
              <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {etapa.etiqueta}
              </span>
            </div>

            <p className="tabular-figures mt-3 font-mono text-3xl font-semibold leading-none">{etapa.valor}</p>
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{etapa.pie}</p>

            {/* Flecha en el borde interior: marca que esto es un recorrido */}
            {!esUltima && (
              <span className="pointer-events-none absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border bg-card p-0.5 lg:flex">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default WorkflowStrip;
